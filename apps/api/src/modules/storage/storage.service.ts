import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomBytes } from 'node:crypto';

import { env } from '@/config/env';

interface PresignOptions {
  /** Prefixo dentro do bucket: ex `avatars/{userId}` */
  keyPrefix: string;
  contentType: string;
  /** Tamanho máx permitido (bytes). Default 5MB. */
  maxSize?: number;
  /** Segundos de validade da URL. Default 60s. */
  ttl?: number;
}

export interface PresignResult {
  uploadUrl: string;
  publicUrl: string;
  key: string;
  expiresIn: number;
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client | null;
  private readonly publicBase: string | null;
  private readonly bucket: string;

  constructor() {
    this.bucket = env.S3_BUCKET;
    if (!env.S3_ENDPOINT || !env.S3_ACCESS_KEY || !env.S3_SECRET_KEY) {
      this.logger.warn('Storage (S3) desabilitado: S3_ENDPOINT/ACCESS_KEY/SECRET_KEY ausentes.');
      this.client = null;
      this.publicBase = null;
      return;
    }
    this.client = new S3Client({
      region: env.S3_REGION,
      endpoint: env.S3_ENDPOINT,
      forcePathStyle: true, // MinIO exige path-style
      credentials: {
        accessKeyId: env.S3_ACCESS_KEY,
        secretAccessKey: env.S3_SECRET_KEY,
      },
    });
    this.publicBase = env.S3_PUBLIC_URL ?? null;
  }

  isEnabled(): boolean {
    return this.client !== null;
  }

  async presignUpload(opts: PresignOptions): Promise<PresignResult> {
    if (!this.client) {
      throw new ServiceUnavailableException('Armazenamento de arquivos não configurado.');
    }
    const ttl = opts.ttl ?? 60;
    const ext = mimeToExt(opts.contentType) ?? 'bin';
    const key = `${opts.keyPrefix.replace(/^\/+|\/+$/g, '')}/${randomBytes(8).toString('hex')}.${ext}`;

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ContentType: opts.contentType,
    });
    const uploadUrl = await getSignedUrl(this.client, cmd, { expiresIn: ttl });

    // Se há domínio público configurado (via Caddy), usa ele. Senão fallback pro endpoint direto.
    const publicBase = this.publicBase ?? `${env.S3_ENDPOINT!}/${this.bucket}`;
    const publicUrl = `${publicBase.replace(/\/+$/, '')}/${key}`;

    return { uploadUrl, publicUrl, key, expiresIn: ttl };
  }
}

function mimeToExt(mime: string): string | null {
  const map: Record<string, string> = {
    'image/png': 'png',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif',
  };
  return map[mime.toLowerCase()] ?? null;
}
