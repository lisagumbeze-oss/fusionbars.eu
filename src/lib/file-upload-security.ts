// ===================================================
// FUSION MUSHROOM BARS EU - FILE UPLOAD SECURITY
// Payment Proof Hardening & Malicious Content Defense
// ===================================================

import crypto from 'crypto';

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFilename?: string;
  secureStorageKey?: string;
  mimeType?: string;
  sizeBytes?: number;
}

export class FileUploadSecurityService {
  // Strict allowed MIME types
  public static readonly ALLOWED_MIME_TYPES = [
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/pdf',
  ];

  // Whitelisted file extensions
  public static readonly ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];

  // Maximum upload size: 5 Megabytes
  public static readonly MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

  // Dangerous executable patterns
  private static readonly EXECUTABLE_EXTENSIONS = [
    '.exe', '.bat', '.sh', '.bin', '.cmd', '.msi', '.vbs', '.js', '.mjs',
    '.ts', '.php', '.phtml', '.php3', '.php4', '.php5', '.phps', '.cgi',
    '.pl', '.py', '.rb', '.jar', '.war', '.jsp', '.asp', '.aspx', '.html',
    '.htm', '.svg', '.xml',
  ];

  /**
   * Validates inbound upload metadata against MIME, size, path-traversal, and double-extension attacks.
   */
  static validateUpload(input: {
    filename: string;
    mimeType: string;
    sizeBytes: number;
    bufferHeaderHex?: string;
  }): FileValidationResult {
    const { filename, mimeType, sizeBytes, bufferHeaderHex } = input;

    // 1. File Size Check
    if (!sizeBytes || sizeBytes <= 0) {
      return { valid: false, error: 'Uploaded file cannot be empty.' };
    }
    if (sizeBytes > this.MAX_FILE_SIZE_BYTES) {
      return {
        valid: false,
        error: `File size exceeds the 5MB maximum limit (received ${(sizeBytes / (1024 * 1024)).toFixed(2)}MB).`,
      };
    }

    // 2. MIME Type Validation
    const cleanMime = mimeType?.toLowerCase().trim();
    if (!cleanMime || !this.ALLOWED_MIME_TYPES.includes(cleanMime)) {
      return {
        valid: false,
        error: `Disallowed MIME type "${cleanMime}". Only JPEG, PNG, WebP, and PDF documents are permitted.`,
      };
    }

    // 3. Filename Sanitization & Path Traversal Check
    if (!filename || typeof filename !== 'string') {
      return { valid: false, error: 'Valid filename required.' };
    }
    if (filename.includes('..') || filename.includes('/') || filename.includes('\\') || filename.includes('\0')) {
      return { valid: false, error: 'Path traversal sequence detected in filename.' };
    }

    const lowerFilename = filename.toLowerCase();

    // 4. Double Extension & Executable Content Checks
    for (const exeExt of this.EXECUTABLE_EXTENSIONS) {
      if (lowerFilename.includes(exeExt)) {
        return {
          valid: false,
          error: `Potential executable content detected (${exeExt}). Upload rejected.`,
        };
      }
    }

    // Check extension matches whitelist
    const dotIdx = lowerFilename.lastIndexOf('.');
    if (dotIdx === -1) {
      return { valid: false, error: 'File must have a valid file extension (.jpg, .png, .pdf).' };
    }

    const ext = lowerFilename.substring(dotIdx);
    if (!this.ALLOWED_EXTENSIONS.includes(ext)) {
      return { valid: false, error: `Disallowed extension "${ext}". Allowed: ${this.ALLOWED_EXTENSIONS.join(', ')}.` };
    }

    // 5. Magic Byte / Hex Header Verification (if provided)
    if (bufferHeaderHex) {
      const hex = bufferHeaderHex.toUpperCase();
      let magicValid = false;

      if (cleanMime === 'application/pdf' && hex.startsWith('25504446')) {
        magicValid = true; // %PDF
      } else if (cleanMime === 'image/jpeg' && hex.startsWith('FFD8FF')) {
        magicValid = true; // JPEG SOI
      } else if (cleanMime === 'image/png' && hex.startsWith('89504E47')) {
        magicValid = true; // PNG
      } else if (cleanMime === 'image/webp' && hex.startsWith('52494646')) {
        magicValid = true; // RIFF / WebP
      }

      if (!magicValid) {
        return { valid: false, error: 'File magic bytes do not match declared MIME type.' };
      }
    }

    // 6. Generate unguessable private storage key (never store original user filename on disk)
    const randomSuffix = crypto.randomBytes(16).toString('hex');
    const safeExt = ext.replace(/[^a-z0-9.]/gi, '');
    const secureStorageKey = `private/proofs/${Date.now()}_${randomSuffix}${safeExt}`;

    return {
      valid: true,
      sanitizedFilename: `proof_${randomSuffix.substring(0, 8)}${safeExt}`,
      secureStorageKey,
      mimeType: cleanMime,
      sizeBytes,
    };
  }

  /**
   * Generates secure HTTP response headers for serving private payment proof files.
   * Enforces no-index and nosniff to prevent script execution or search engine crawl.
   */
  static getPrivateSecurityHeaders(mimeType: string, downloadName: string = 'proof.pdf'): Record<string, string> {
    return {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${downloadName.replace(/["\r\n]/g, '')}"`,
      'X-Content-Type-Options': 'nosniff',
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
      'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    };
  }
}
