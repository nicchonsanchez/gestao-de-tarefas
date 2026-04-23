import { Injectable } from '@nestjs/common';
import argon2 from 'argon2';

/**
 * Hash e verificação de senhas com argon2id.
 *
 * Parâmetros seguem recomendação OWASP 2024:
 *  - memoryCost: 64 MiB (2^16 KiB)
 *  - timeCost: 3 iterações
 *  - parallelism: 4
 */
@Injectable()
export class PasswordService {
  private readonly options: argon2.Options = {
    type: argon2.argon2id,
    memoryCost: 2 ** 16,
    timeCost: 3,
    parallelism: 4,
  };

  hash(plain: string): Promise<string> {
    return argon2.hash(plain, this.options);
  }

  async verify(hash: string, plain: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, plain);
    } catch {
      return false;
    }
  }

  /**
   * Indica se um hash existente precisa ser re-hasheado (parâmetros mudaram).
   * Ao logar, se verify() retorna true e needsRehash() também retorna true,
   * a senha deve ser re-hasheada com os parâmetros atuais.
   */
  needsRehash(hash: string): boolean {
    return argon2.needsRehash(hash, this.options);
  }
}
