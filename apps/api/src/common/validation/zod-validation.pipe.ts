import { BadRequestException, PipeTransform, Injectable } from '@nestjs/common';
import type { ZodTypeAny, z } from 'zod';

/**
 * Pipe que valida com um schema Zod. Uso:
 *
 *   @Post('login')
 *   login(@Body(new ZodValidationPipe(LoginRequestSchema)) dto: LoginRequest) { ... }
 *
 * Em caso de erro, transforma em BadRequestException com o formato do Zod flattened,
 * compatível com o que o frontend já entende.
 */
@Injectable()
export class ZodValidationPipe<T extends ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.infer<T> {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      const { fieldErrors, formErrors } = result.error.flatten();
      throw new BadRequestException({
        statusCode: 400,
        error: 'Bad Request',
        message: 'Dados inválidos.',
        errors: { form: formErrors, fields: fieldErrors },
      });
    }
    return result.data;
  }
}
