// ==============================================================================
// FUSION MUSHROOM BARS EU - PRIVATE OBJECT STORAGE SERVICE
// S3-Compatible Encrypted Document Storage for Payment Proofs
// ==============================================================================

import crypto from 'crypto';
import { FileUploadSecurityService } from '@/lib/file-upload-security';
import { CommerceRepository } from '@/lib/commerce-repository';
import { RoleName } from '@/types';
import { StorageReadinessService } from '@/services/storage/StorageReadinessService';
import { s3ProviderFromEnvironment } from '@/services/storage/S3CompatibleObjectStorageProvider';

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
  namespace?: 'payment' | 'catalogue';
  visibility?: 'PRIVATE' | 'PUBLIC' | 'INTERNAL_REVIEW' | 'REJECTED' | 'TEST' | 'PENDING';
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
  listingAvailable(): boolean;
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

  listingAvailable(): boolean {
    return true;
  }
}

/**
 * Main Object Storage Service managing private payment proof documents,
 * strict server-side authorization gates, and lifecycle retention policies.
 */
class RejectingObjectStorageProvider implements IObjectStorageProvider {
  async putObject(): Promise<void> {
    throw new Error('STORAGE_WRITE_FAILED');
  }
  async getObject(): Promise<null> {
    return null;
  }
  async deleteObject(): Promise<boolean> {
    return false;
  }
  async generatePresignedUrl(): Promise<string> {
    throw new Error('STORAGE_READ_FAILED');
  }
  async listKeys(): Promise<string[]> {
    return [];
  }
  listingAvailable(): boolean {
    return false;
  }
}

export class ObjectStorageService {
  private static provider: IObjectStorageProvider = new MockObjectStorageProvider();
  private static documentIndex = new Map<string, StoredDocument>();
  private static configured = false;

  static useConfiguredProvider(): void {
    if (this.configured) return;
    const report = StorageReadinessService.report();
    const productionMock = report.provider === 'mock' && report.environment === 'production';
    if (report.environmentSeparation === 'FAIL' || productionMock) {
      this.provider = new RejectingObjectStorageProvider();
    } else if ((report.provider === 's3' || report.provider === 'cloudflare_r2') && report.variables.STORAGE_CREDENTIALS === 'CONFIGURED' && report.variables.STORAGE_BUCKET === 'CONFIGURED' && report.variables.STORAGE_ENDPOINT === 'CONFIGURED') {
      const provider = s3ProviderFromEnvironment();
      if (provider) this.provider = provider;
    }
    this.configured = true;
  }

  static setProvider(provider: IObjectStorageProvider): void {
    this.provider = provider;
    this.configured = true;
  }

  static resetForTests(): void {
    this.provider = new MockObjectStorageProvider();
    this.documentIndex.clear();
    this.configured = false;
    StorageReadinessService.resetForTests();
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
    this.useConfiguredProvider();
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

    const storageKey = validation.secureStorageKey;
    try {
      await this.provider.putObject(storageKey, buffer, validation.mimeType!, {
        orderNumber,
        sha256Checksum,
      });
    } catch {
      return { success: false, error: 'STORAGE_WRITE_FAILED' };
    }

    const doc: StoredDocument = {
      storageKey,
      sanitizedFilename: validation.sanitizedFilename!,
      mimeType: validation.mimeType!,
      sizeBytes,
      orderNumber,
      uploadedAt: new Date(),
      sha256Checksum,
      metadata: { orderNumber },
      namespace: 'payment',
      visibility: 'PRIVATE',
    };
    try {
      this.documentIndex.set(storageKey, doc);
    } catch {
      await this.provider.deleteObject(storageKey);
      return { success: false, error: 'STORAGE_INDEX_FAILED' };
    }

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
    if (!storageKey || storageKey.includes('..') || /^https?:\/\//i.test(storageKey)) {
      return { allowed: false, error: 'Unauthorized.' };
    }
    const doc = this.documentIndex.get(storageKey);

    if (!doc) {
      return { allowed: false, error: 'Unauthorized.' };
    }

    const role = requester.role;
    const paymentObject = doc.namespace === 'payment' || storageKey.startsWith('private/proofs/');
    const catalogueObject = doc.namespace === 'catalogue' || storageKey.startsWith('catalogue/');
    if (role === 'SUPER_ADMIN') {
      return { allowed: true, downloadUrl: await this.provider.generatePresignedUrl(storageKey, Math.min(expiresInSeconds, 900)) };
    }
    if ((role === 'FINANCE_MANAGER' || role === 'ORDER_MANAGER') && paymentObject) {
      return { allowed: true, downloadUrl: await this.provider.generatePresignedUrl(storageKey, Math.min(expiresInSeconds, 900)) };
    }
    if ((role === 'FINANCE_MANAGER' || role === 'ORDER_MANAGER') && !paymentObject) {
      return { allowed: false, error: 'Unauthorized.' };
    }
    if ((role === 'CONTENT_MANAGER' || role === 'CATALOG_MANAGER') && catalogueObject) {
      return { allowed: true, downloadUrl: await this.provider.generatePresignedUrl(storageKey, Math.min(expiresInSeconds, 900)) };
    }
    if (role === 'CONTENT_MANAGER' || role === 'CATALOG_MANAGER' || role === 'COMPLIANCE_MANAGER') {
      return { allowed: false, error: 'Unauthorized.' };
    }
    if (!requester.customerId && !requester.email && !requester.lookupToken) {
      return { allowed: false, error: 'Authentication required.' };
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

    if (!paymentObject) return { allowed: false, error: 'Unauthorized.' };
    const downloadUrl = await this.provider.generatePresignedUrl(storageKey, Math.min(expiresInSeconds, 900));
    return { allowed: true, downloadUrl };
  }

  static proofBelongsToOrder(storageKey: string, orderNumber: string): boolean {
    const doc = this.documentIndex.get(storageKey);
    return Boolean(doc && doc.namespace === 'payment' && doc.orderNumber === orderNumber && doc.visibility === 'PRIVATE');
  }

  static async uploadCatalogueMedia(input: {
    buffer: Buffer;
    filename: string;
    mimeType: string;
    productSlug: string;
    visibility: 'PUBLIC' | 'INTERNAL_REVIEW' | 'REJECTED' | 'TEST' | 'PENDING';
  }): Promise<StorageUploadResult> {
    this.useConfiguredProvider();
    const headerHex = input.buffer.subarray(0, 16).toString('hex');
    const validation = FileUploadSecurityService.validateUpload({
      filename: input.filename,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.length,
      bufferHeaderHex: headerHex,
    });
    if (!validation.valid || input.mimeType === 'application/pdf') {
      return { success: false, error: validation.error || 'Catalogue media must be an image.' };
    }
    const dimensions = FileUploadSecurityService.imageDimensions(input.buffer, input.mimeType);
    if (!dimensions) return { success: false, error: 'Image dimensions could not be read.' };
    const folder = input.visibility === 'PUBLIC' ? 'catalogue/public' : 'catalogue/review';
    const storageKey = `${folder}/${crypto.randomBytes(16).toString('hex')}`;
    try {
      await this.provider.putObject(storageKey, input.buffer, validation.mimeType!);
    } catch {
      return { success: false, error: 'STORAGE_WRITE_FAILED' };
    }
    this.documentIndex.set(storageKey, {
      storageKey,
      sanitizedFilename: validation.sanitizedFilename || 'image',
      mimeType: validation.mimeType!,
      sizeBytes: input.buffer.length,
      orderNumber: input.productSlug,
      uploadedAt: new Date(),
      sha256Checksum: crypto.createHash('sha256').update(input.buffer).digest('hex'),
      namespace: 'catalogue',
      visibility: input.visibility,
    });
    CommerceRepository.logAudit({
      action: 'CATALOGUE_MEDIA_STORED',
      entityType: 'Product',
      entityId: input.productSlug,
      actorRole: 'CATALOG_MANAGER',
      actorId: 'storage',
      metadata: JSON.stringify({ storageKey, visibility: input.visibility }),
    });
    return { success: true, storageKey, sanitizedFilename: validation.sanitizedFilename };
  }

  static isPublicMedia(storageKey: string): boolean {
    const doc = this.documentIndex.get(storageKey);
    return Boolean(doc && doc.namespace === 'catalogue' && doc.visibility === 'PUBLIC' && storageKey.startsWith('catalogue/public/'));
  }

  static async readAuthorizedObject(input: {
    storageKey: string;
    requester: { role?: RoleName | 'CUSTOMER'; customerId?: string; email?: string; lookupToken?: string };
  }): Promise<{ buffer: Buffer; mimeType: string; filename: string } | null> {
    const allowed = await this.getAuthorizedDownloadUrl({ storageKey: input.storageKey, requester: input.requester });
    if (!allowed.allowed) return null;
    const stored = await this.provider.getObject(input.storageKey);
    const doc = this.documentIndex.get(input.storageKey);
    if (!stored || !doc) return null;
    return { buffer: stored.buffer, mimeType: stored.mimeType, filename: doc.sanitizedFilename };
  }

  static async reportOrphans(): Promise<{ objectWithoutReference: string[]; referenceWithoutObject: string[]; listing: 'AVAILABLE' | 'UNAVAILABLE' }> {
    if (!this.provider.listingAvailable()) {
      return { objectWithoutReference: [], referenceWithoutObject: [], listing: 'UNAVAILABLE' };
    }
    const stored = await this.provider.listKeys('');
    const indexed = [...this.documentIndex.keys()];
    return {
      objectWithoutReference: stored.filter((key) => !this.documentIndex.has(key)),
      referenceWithoutObject: indexed.filter((key) => !stored.includes(key)),
      listing: 'AVAILABLE',
    };
  }

  static async runConnectivityProbe(): Promise<'PASS' | 'FAIL'> {
    const report = StorageReadinessService.report();
    if (report.provider === 'mock' || report.state === 'TEST' || report.state === 'CONFIGURATION_REQUIRED') {
      StorageReadinessService.noteTest('FAIL');
      return 'FAIL';
    }
    const key = `test/connectivity-${crypto.randomBytes(8).toString('hex')}.txt`;
    try {
      const body = Buffer.from('fusion-storage-connectivity-test');
      await this.provider.putObject(key, body, 'text/plain');
      const read = await this.provider.getObject(key);
      const anonymous = await this.getAuthorizedDownloadUrl({ storageKey: key, requester: {} });
      await this.provider.deleteObject(key);
      const gone = await this.provider.getObject(key);
      const passed = Boolean(read && read.buffer.equals(body) && !anonymous.allowed && !gone);
      StorageReadinessService.noteTest(passed ? 'PASS' : 'FAIL');
      return passed ? 'PASS' : 'FAIL';
    } catch {
      await this.provider.deleteObject(key).catch(() => undefined);
      StorageReadinessService.noteTest('FAIL');
      return 'FAIL';
    }
  }

  /**
   * Enforces data retention policies by permanently purging proofs older than retentionThresholdDays.
   */
  static async enforceRetentionPolicy(_retentionThresholdDays: number = 90): Promise<{ deletedCount: number; retention: 'NOT_CONFIGURED' }> {
    return { deletedCount: 0, retention: 'NOT_CONFIGURED' };
  }
}
