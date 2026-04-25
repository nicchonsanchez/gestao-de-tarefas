import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/validation/zod-validation.pipe';
import { TenantGuard } from '@/common/tenant/tenant.guard';
import { CurrentOrg } from '@/common/tenant/current-org.decorator';
import type { TenantContext } from '@/common/tenant/tenant.types';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedRequestContext } from '@/modules/auth/auth.types';

import { AttachmentsService } from './attachments.service';
import {
  CreateAttachmentSchema,
  PresignAttachmentSchema,
  type CreateAttachmentRequest,
  type PresignAttachmentRequest,
} from './dto/attachment.schemas';

@ApiTags('attachments')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller({ path: '', version: '1' })
export class AttachmentsController {
  constructor(private readonly service: AttachmentsService) {}

  @Post('cards/:cardId/attachments/presign')
  @ApiOperation({ summary: 'Gera URL pré-assinada pra upload de anexo' })
  presign(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(PresignAttachmentSchema)) body: PresignAttachmentRequest,
  ) {
    return this.service.presignUpload(user.userId, org, cardId, body);
  }

  @Post('cards/:cardId/attachments')
  @ApiOperation({ summary: 'Registra anexo após upload no storage' })
  create(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(CreateAttachmentSchema)) body: CreateAttachmentRequest,
  ) {
    return this.service.create(user.userId, org, cardId, body);
  }

  @Post('comments/:commentId/attachments/presign')
  @ApiOperation({ summary: 'Presign upload de anexo da timeline (comment)' })
  presignForComment(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(PresignAttachmentSchema)) body: PresignAttachmentRequest,
  ) {
    return this.service.presignUploadForComment(user.userId, org, commentId, body);
  }

  @Post('comments/:commentId/attachments')
  @ApiOperation({ summary: 'Registra anexo da timeline (vinculado a um comment)' })
  createForComment(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('commentId') commentId: string,
    @Body(new ZodValidationPipe(CreateAttachmentSchema)) body: CreateAttachmentRequest,
  ) {
    return this.service.createForComment(user.userId, org, commentId, body);
  }

  @Delete('attachments/:attachmentId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover anexo' })
  async remove(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('attachmentId') attachmentId: string,
  ): Promise<void> {
    await this.service.remove(user.userId, org, attachmentId);
  }
}
