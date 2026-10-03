import crypto from 'crypto';
import type { IObjectStorageProvider } from '@/services/storage/ObjectStorageService';

function encodePath(value: string): string {
  return value.split('/').map((part) => encodeURIComponent(part).replace(/[!'()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`)).join('/');
}

function hmac(key: Buffer | string, value: string): Buffer {
  return crypto.createHmac('sha256', key).update(value).digest();
}

function hash(value: string | Buffer): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function signingKey(secret: string, date: string, region: string): Buffer {
  return hmac(hmac(hmac(hmac(`AWS4${secret}`, date), region), 's3'), 'aws4_request');
}

export class S3CompatibleObjectStorageProvider implements IObjectStorageProvider {
  constructor(private readonly options: {
    endpoint: string;
    bucket: string;
    region: string;
    accessKey: string;
    secretKey: string;
  }) {}

  private urlFor(key: string): URL {
    const base = this.options.endpoint.replace(/\/$/, '');
    return new URL(`${base}/${this.options.bucket}/${encodePath(key)}`);
  }

  private async signed(method: string, key: string, body?: Buffer, extraHeaders: Record<string, string> = {}): Promise<Response> {
    const url = this.urlFor(key);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = amzDate.slice(0, 8);
    const payload = hash(body || '');
    const headers: Record<string, string> = {
      host: url.host,
      'x-amz-content-sha256': payload,
      'x-amz-date': amzDate,
      ...extraHeaders,
    };
    const names = Object.keys(headers).map((name) => name.toLowerCase()).sort();
    const canonicalHeaders = names.map((name) => `${name}:${headers[name].trim()}\n`).join('');
    const signedHeaders = names.join(';');
    const canonical = [method, url.pathname, '', canonicalHeaders, signedHeaders, payload].join('\n');
    const scope = `${date}/${this.options.region}/s3/aws4_request`;
    const signature = hmac(signingKey(this.options.secretKey, date, this.options.region), `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${hash(canonical)}`).toString('hex');
    return fetch(url, {
      method,
      headers: {
        ...headers,
        Authorization: `AWS4-HMAC-SHA256 Credential=${this.options.accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
      },
      body: body ? new Uint8Array(body) : undefined,
    });
  }

  async putObject(key: string, buffer: Buffer, mimeType: string): Promise<void> {
    const response = await this.signed('PUT', key, buffer, { 'content-type': mimeType });
    if (!response.ok) throw new Error('STORAGE_WRITE_FAILED');
  }

  async getObject(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
    const response = await this.signed('GET', key);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('STORAGE_READ_FAILED');
    return { buffer: Buffer.from(await response.arrayBuffer()), mimeType: response.headers.get('content-type') || 'application/octet-stream' };
  }

  async deleteObject(key: string): Promise<boolean> {
    const response = await this.signed('DELETE', key);
    return response.ok || response.status === 404;
  }

  async generatePresignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const url = this.urlFor(key);
    const ttl = Math.min(Math.max(expiresInSeconds, 1), 900);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = amzDate.slice(0, 8);
    const scope = `${date}/${this.options.region}/s3/aws4_request`;
    const params = new URLSearchParams({
      'X-Amz-Algorithm': 'AWS4-HMAC-SHA256',
      'X-Amz-Credential': `${this.options.accessKey}/${scope}`,
      'X-Amz-Date': amzDate,
      'X-Amz-Expires': String(ttl),
      'X-Amz-SignedHeaders': 'host',
    });
    const canonicalQuery = [...params.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([name, value]) => `${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join('&');
    const canonical = ['GET', url.pathname, canonicalQuery, `host:${url.host}\n`, 'host', 'UNSIGNED-PAYLOAD'].join('\n');
    const signature = hmac(signingKey(this.options.secretKey, date, this.options.region), `AWS4-HMAC-SHA256\n${amzDate}\n${scope}\n${hash(canonical)}`).toString('hex');
    return `${url.origin}${url.pathname}?${canonicalQuery}&X-Amz-Signature=${signature}`;
  }

  async listKeys(): Promise<string[]> {
    return [];
  }

  listingAvailable(): boolean {
    return false;
  }
}

export function s3ProviderFromEnvironment(): S3CompatibleObjectStorageProvider | null {
  const endpoint = process.env.STORAGE_ENDPOINT || '';
  const bucket = process.env.STORAGE_BUCKET || '';
  const accessKey = process.env.STORAGE_ACCESS_KEY || '';
  const secretKey = process.env.STORAGE_SECRET_KEY || '';
  if (!endpoint || !bucket || !accessKey || !secretKey) return null;
  return new S3CompatibleObjectStorageProvider({
    endpoint,
    bucket,
    region: process.env.STORAGE_REGION || 'auto',
    accessKey,
    secretKey,
  });
}
