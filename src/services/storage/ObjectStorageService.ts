// ==============================================================================
// FUSION MUSHROOM BARS EU - PRIVATE OBJECT STORAGE SERVICE
// S3-Compatible Encrypted Document Storage for Payment Proofs
// ==============================================================================

import crypto from 'crypto';
import { FileUploadSecurityService, FileValidationResult } from '@/lib/file-upload-security';
import { CommerceRepository } from '@/lib/commerce-repository';
import { RoleName } from '@/types';

export interface StoredDocument {
  storageKey: string;
  sanitizedFilename: string;
  mimeType: string;
  sizeBytes: number;
  orderNumber: string;
  uploadedAt: Date;
  expiresAt?: Date;
  sha256Checksum: string;
  metadata?: Record<string, string>;
}

export interface StorageUploadResult {
  success: boolean;
  storageKey?: string;
  sanitizedFilename?: string;
  error?: string;
  sha256Checksum?: string;
}

export interface IObjectStorageProvider {
  putObject(key: string, buffer: Buffer, mimeType: string, metadata?: Record<string, string>): Promise<void>;
  getObject(key: string): Promise<{ buffer: Buffer; mimeType: string } | null>;
  deleteObject(key: string): Promise<boolean>;
  generatePresignedUrl(key: string, expiresInSeconds: number): Promise<string>;
  listKeys(prefix?: string): Promise<string[]>;
}

/**
 * Memory-backed secure storage provider for development, automated test suites, and mock runtimes.
 */
export class MockObjectStorageProvider implements IObjectStorageProvider {
  private objects = new Map<string, { buffer: Buffer; mimeType: string; metadata?: Record<string, string>; uploadedAt: Date }>();

  async putObject(key: string, buffer: Buffer, mimeType: string, metadata?: Record<string, string>): Promise<void> {
    this.objects.set(key, { buffer, mimeType, metadata, uploadedAt: new Date() });
  }

  async getObject(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const item = this.objects.get(key);
    if (!item) return null;
    return { buffer: item.buffer, mimeType: item.mimeType };
  }

  async deleteObject(key: string): Promise<boolean> {
    return this.objects.delete(key);
  }

  async generatePresignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const token = crypto.randomBytes(24).toString('hex');
    const expiry = Date.now() + expiresInSeconds * 1000;
    return `https://storage.fusionbars.eu/private/download?key=${encodeURIComponent(key)}&token=${token}&expires=${expiry}`;
  }

  async listKeys(prefix: string = ''): Promise<string[]> {
    const keys: string[] = [];
    for (const key of this.objects.keys()) {
      if (key.startsWith(prefix)) keys.push(key);
    }
    return keys;
  }
}

/**
 * Main Object Storage Service managing private payment proof documents,
 * strict server-side authorization gates, and lifecycle retention policies.
 */
export class ObjectStorageService {
  private static provider: IObjectStorageProvider = new MockObjectStorageProvider();
  private static documentIndex = new Map<string, StoredDocument>();

  /**
   * Overrides or configures the active storage provider (e.g. for S3/R2).
   */
  static setProvider(provider: IObjectStorageProvider): void {
    this.provider = provider;
  }

  /**
   * Validates and securely uploads a payment proof document.
   */
  static async uploadPaymentProof(input: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    orderNumber: string;
    uploadedByEmail?: string;
  }): Promise<StorageUploadResult> {
    const { buffer, filename, mimeType, orderNumber, uploadedByEmail } = input;
    const sizeBytes = buffer.length;

    // 1. Strict security & MIME validation
    const headerHex = buffer.subarray(0, 8).toString('hex');
    const validation = FileUploadSecurityService.validateUpload({
      filename,
      mimeType,
      sizeBytes,
      bufferHeaderHex: headerHex,
    });

    if (!validation.valid || !validation.secureStorageKey) {
      return {
        success: false,
        error: validation.error || 'File validation failed.',
      };
    }

    // 2. Compute SHA-256 for audit immutability
    const sha256Checksum = crypto.createHash('sha256').update(buffer).digest('hex');

    // 3. Store via provider in private bucket
    const storageKey = validation.secureStorageKey;
    await this.provider.putObject(storageKey, buffer, validation.mimeType!, {
      orderNumber,
      uploadedByEmail: uploadedByEmail || 'guest',
      sha256Checksum,
    });

    // 4. Index document record
    const doc: StoredDocument = {
      storageKey,
      sanitizedFilename: validation.sanitizedFilename!,
      mimeType: validation.mimeType!,
      sizeBytes,
      orderNumber,
      uploadedAt: new Date(),
      sha256Checksum,
      metadata: { orderNumber },
    };
    this.documentIndex.set(storageKey, doc);

    // 5. Audit log
    CommerceRepository.logAudit({
      action: 'PAYMENT_PROOF_STORED',
      entityType: 'PaymentTransaction',
      entityId: orderNumber,
      actorRole: 'CUSTOMER',
      actorId: uploadedByEmail || 'guest',
      metadata: JSON.stringify({
        storageKey,
        sha256: sha256Checksum,
        sizeBytes,
        mimeType: validation.mimeType,
      }),
    });

    return {
      success: true,
      storageKey,
      sanitizedFilename: validation.sanitizedFilename,
      sha256Checksum,
    };
  }

  /**
   * Verifies access authorization before minting a presigned download URL.
   * Only allows:
   * - The customer who owns the order
   * - A guest with the valid order lookup token
   * - An authorized administrative role (SUPER_ADMIN, FINANCE_MANAGER, ORDER_MANAGER)
   */
  static async getAuthorizedDownloadUrl(input: {
    storageKey: string;
    requester: {
      role?: RoleName | 'CUSTOMER';
      customerId?: string;
      email?: string;
      lookupToken?: string;
    };
    expiresInSeconds?: number;
  }): Promise<{ allowed: boolean; downloadUrl?: string; error?: string }> {
    const { storageKey, requester, expiresInSeconds = 900 } = input;
    const doc = this.documentIndex.get(storageKey);

    if (!doc) {
      return { allowed: false, error: 'Document record not found.' };
    }

    // Administrative override
    const adminRoles: RoleName[] = ['SUPER_ADMIN', 'FINANCE_MANAGER', 'ORDER_MANAGER'];
    if (requester.role && adminRoles.includes(requester.role as RoleName)) {
      const downloadUrl = await this.provider.generatePresignedUrl(storageKey, expiresInSeconds);
      return { allowed: true, downloadUrl };
    }

    // Order ownership check
    const order = await CommerceRepository.findOrderByIdOrNumber(doc.orderNumber);
    if (!order) {
      return { allowed: false, error: 'Associated order record missing.' };
    }

    const isCustomerOwner = requester.customerId && order.customerId === requester.customerId;
    const isEmailOwner = requester.email && (order.guestEmail === requester.email);
    const isTokenOwner = requester.lookupToken && order.lookupToken === requester.lookupToken;

    if (!isCustomerOwner && !isEmailOwner && !isTokenOwner) {
      CommerceRepository.logAudit({
        action: 'UNAUTHORIZED_PROOF_ACCESS_ATTEMPT',
        entityType: 'Order',
        entityId: doc.orderNumber,
        actorRole: requester.role || 'GUEST',
        actorId: requester.email || requester.customerId || 'anonymous',
        metadata: JSON.stringify({ attemptedKey: storageKey }),
      });
      return { allowed: false, error: 'Unauthorized: You do not have permission to view this payment proof.' };
    }

    const downloadUrl = await this.provider.generatePresignedUrl(storageKey, expiresInSeconds);
    return { allowed: true, downloadUrl };
  }

  /**
   * Enforces data retention policies by permanently purging proofs older than retentionThresholdDays.
   */
  static async enforceRetentionPolicy(retentionThresholdDays: number = 90): Promise<{ deletedCount: number }> {
    const cutoff = Date.now() - retentionThresholdDays * 24 * 60 * 60 * 1000;
    let deletedCount = 0;

    for (const [key, doc] of this.documentIndex.entries()) {
      if (doc.uploadedAt.getTime() < cutoff) {
        await this.provider.deleteObject(key);
        this.documentIndex.delete(key);
        deletedCount++;
      }
    }

    return { deletedCount };
  }
}
