import {
  Body,
  Controller,
  Delete,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
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

import { ChecklistsService } from './checklists.service';
import {
  CreateChecklistSchema,
  CreateItemSchema,
  MoveItemSchema,
  UpdateChecklistSchema,
  UpdateItemSchema,
  type CreateChecklistRequest,
  type CreateItemRequest,
  type MoveItemRequest,
  type UpdateChecklistRequest,
  type UpdateItemRequest,
} from './dto/checklist.schemas';

@ApiTags('checklists')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller({ path: 'checklists', version: '1' })
export class ChecklistsController {
  constructor(private readonly service: ChecklistsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar checklist em um card' })
  create(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Body(new ZodValidationPipe(CreateChecklistSchema)) body: CreateChecklistRequest,
  ) {
    return this.service.create(user.userId, org, body);
  }

  @Patch(':checklistId')
  @ApiOperation({ summary: 'Renomear checklist' })
  update(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('checklistId') checklistId: string,
    @Body(new ZodValidationPipe(UpdateChecklistSchema)) body: UpdateChecklistRequest,
  ) {
    return this.service.update(user.userId, org, checklistId, body);
  }

  @Delete(':checklistId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover checklist e seus itens' })
  async remove(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('checklistId') checklistId: string,
  ): Promise<void> {
    await this.service.remove(user.userId, org, checklistId);
  }

  @Post(':checklistId/items')
  @ApiOperation({ summary: 'Adicionar item à checklist' })
  addItem(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('checklistId') checklistId: string,
    @Body(new ZodValidationPipe(CreateItemSchema)) body: CreateItemRequest,
  ) {
    return this.service.addItem(user.userId, org, checklistId, body);
  }

  @Patch('items/:itemId')
  @ApiOperation({ summary: 'Atualizar item (texto, concluído, prazo, atribuição)' })
  updateItem(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(UpdateItemSchema)) body: UpdateItemRequest,
  ) {
    return this.service.updateItem(user.userId, org, itemId, body);
  }

  @Delete('items/:itemId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover item' })
  async removeItem(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('itemId') itemId: string,
  ): Promise<void> {
    await this.service.removeItem(user.userId, org, itemId);
  }

  @Patch('items/:itemId/move')
  @ApiOperation({ summary: 'Reordenar item (ou mover para outra checklist do mesmo card)' })
  moveItem(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('itemId') itemId: string,
    @Body(new ZodValidationPipe(MoveItemSchema)) body: MoveItemRequest,
  ) {
    return this.service.moveItem(user.userId, org, itemId, body);
  }
}
