import { Injectable } from '@nestjs/common';
import { createHash, randomBytes } from 'node:crypto';

/**
 * Gera e hasheia tokens opacos (refresh tokens, invite tokens, etc).
 *
 * JWT é usado para access token (assinado, stateless). Para refresh token
 * usamos um opaque string com hash SHA-256 armazenado no DB, permitindo
 * revogação fina (por sessão).
 */
@Injectable()
export class TokenService {
  /**
   * Gera 48 bytes aleatórios → base64url (~64 chars). Seguro pra refresh token.
   */
  generate(): string {
    return randomBytes(48).toString('base64url');
  }

  /**
   * Hash SHA-256 hex (comparação constante-time via crypto.timingSafeEqual quando necessário).
   */
  hash(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }
}
