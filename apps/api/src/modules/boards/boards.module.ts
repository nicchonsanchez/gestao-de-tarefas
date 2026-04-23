import { Module } from '@nestjs/common';

import { TenantGuard } from '@/common/tenant/tenant.guard';

import { BoardsService } from './boards.service';
import { BoardAccessService } from './board-access.service';
import { BoardsController } from './boards.controller';

@Module({
  controllers: [BoardsController],
  providers: [BoardsService, BoardAccessService, TenantGuard],
  exports: [BoardsService, BoardAccessService],
})
export class BoardsModule {}
