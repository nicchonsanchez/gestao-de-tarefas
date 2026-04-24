import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import {
  ChangePasswordRequestSchema,
  UpdateProfileRequestSchema,
  type ChangePasswordRequest,
  type UpdateProfileRequest,
  type User as UserContract,
} from '@ktask/contracts';
import { ZodValidationPipe } from '@/common/validation/zod-validation.pipe';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedRequestContext } from '@/modules/auth/auth.types';
import { AuthService } from '@/modules/auth/auth.service';

import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller({ path: 'users', version: '1' })
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly auth: AuthService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'Dados do usuário autenticado' })
  async me(@CurrentUser() user: AuthenticatedRequestContext): Promise<UserContract> {
    const me = await this.users.findPublicById(user.userId);
    return {
      id: me.id,
      email: me.email,
      name: me.name,
      avatarUrl: me.avatarUrl,
      locale: me.locale,
      timezone: me.timezone,
      twoFactorEnabled: me.twoFactorEnabled,
      createdAt: me.createdAt.toISOString(),
    };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Atualiza o próprio perfil (nome, avatar, locale, timezone)' })
  async updateMe(
    @CurrentUser() user: AuthenticatedRequestContext,
    @Body(new ZodValidationPipe(UpdateProfileRequestSchema)) body: UpdateProfileRequest,
  ): Promise<UserContract> {
    const updated = await this.users.updateProfile(user.userId, body);
    return {
      id: updated.id,
      email: updated.email,
      name: updated.name,
      avatarUrl: updated.avatarUrl,
      locale: updated.locale,
      timezone: updated.timezone,
      twoFactorEnabled: updated.twoFactorEnabled,
      createdAt: updated.createdAt.toISOString(),
    };
  }

  @Post('me/change-password')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Trocar a própria senha (invalida outras sessões)' })
  async changePassword(
    @CurrentUser() user: AuthenticatedRequestContext,
    @Body(new ZodValidationPipe(ChangePasswordRequestSchema)) body: ChangePasswordRequest,
  ): Promise<void> {
    await this.auth.changePassword(user.userId, body.currentPassword, body.newPassword);
  }
}
