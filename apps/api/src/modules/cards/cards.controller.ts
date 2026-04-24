import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ZodValidationPipe } from '@/common/validation/zod-validation.pipe';
import { TenantGuard } from '@/common/tenant/tenant.guard';
import { CurrentOrg } from '@/common/tenant/current-org.decorator';
import type { TenantContext } from '@/common/tenant/tenant.types';
import { CurrentUser } from '@/modules/auth/decorators/current-user.decorator';
import type { AuthenticatedRequestContext } from '@/modules/auth/auth.types';

import { CardsService } from './cards.service';
import {
  CreateCardSchema,
  UpdateCardSchema,
  MoveCardSchema,
  MemberIdSchema,
  LabelIdSchema,
  type CreateCardRequest,
  type UpdateCardRequest,
  type MoveCardRequest,
} from './dto/card.schemas';

@ApiTags('cards')
@ApiBearerAuth()
@UseGuards(TenantGuard)
@Controller({ path: 'cards', version: '1' })
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Post()
  @ApiOperation({ summary: 'Criar card numa lista' })
  create(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Body(new ZodValidationPipe(CreateCardSchema)) body: CreateCardRequest,
  ) {
    return this.cards.create(user.userId, org, body);
  }

  @Get(':cardId')
  @ApiOperation({ summary: 'Detalhe do card (com comentários, labels, etc)' })
  getOne(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
  ) {
    return this.cards.getOne(user.userId, org, cardId);
  }

  @Patch(':cardId')
  @ApiOperation({ summary: 'Atualizar campos do card' })
  update(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(UpdateCardSchema)) body: UpdateCardRequest,
  ) {
    return this.cards.update(user.userId, org, cardId, body);
  }

  @Patch(':cardId/move')
  @ApiOperation({ summary: 'Mover card entre listas / reordenar' })
  move(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(MoveCardSchema)) body: MoveCardRequest,
  ) {
    return this.cards.move(user.userId, org, cardId, body);
  }

  @Delete(':cardId')
  @ApiOperation({ summary: 'Arquivar card' })
  archive(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
  ) {
    return this.cards.archive(user.userId, org, cardId);
  }

  @Post(':cardId/restore')
  restore(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
  ) {
    return this.cards.restore(user.userId, org, cardId);
  }

  @Post(':cardId/duplicate')
  @ApiOperation({ summary: 'Duplica o card (copia labels, membros, checklists)' })
  duplicate(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
  ) {
    return this.cards.duplicate(user.userId, org, cardId);
  }

  @Delete(':cardId/permanent')
  @ApiOperation({ summary: 'Excluir card permanentemente (irreversível)' })
  deletePermanent(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
  ) {
    return this.cards.deletePermanent(user.userId, org, cardId);
  }

  @Post(':cardId/complete')
  @ApiOperation({ summary: 'Finalizar card (entra no histórico do quadro)' })
  complete(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
  ) {
    return this.cards.complete(user.userId, org, cardId);
  }

  @Post(':cardId/uncomplete')
  @ApiOperation({ summary: 'Reabrir card finalizado (volta para uma lista ativa)' })
  uncomplete(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Body() body: { toListId?: string },
  ) {
    return this.cards.uncomplete(user.userId, org, cardId, body?.toListId);
  }

  @Post(':cardId/members')
  @ApiOperation({ summary: 'Atribuir membro ao card' })
  assign(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(MemberIdSchema)) body: { userId: string },
  ) {
    return this.cards.assignMember(user.userId, org, cardId, body.userId);
  }

  @Delete(':cardId/members/:memberUserId')
  @ApiOperation({ summary: 'Remover membro do card' })
  unassign(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.cards.unassignMember(user.userId, org, cardId, memberUserId);
  }

  @Post(':cardId/labels')
  addLabel(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Body(new ZodValidationPipe(LabelIdSchema)) body: { labelId: string },
  ) {
    return this.cards.addLabel(user.userId, org, cardId, body.labelId);
  }

  @Delete(':cardId/labels/:labelId')
  removeLabel(
    @CurrentUser() user: AuthenticatedRequestContext,
    @CurrentOrg() org: TenantContext,
    @Param('cardId') cardId: string,
    @Param('labelId') labelId: string,
  ) {
    return this.cards.removeLabel(user.userId, org, cardId, labelId);
  }
}
