import { Module } from '@nestjs/common';

import { TenantGuard } from '@/common/tenant/tenant.guard';
import { BoardsModule } from '@/modules/boards/boards.module';

import { ListsService } from './lists.service';
import { ListsController } from './lists.controller';

@Module({
  imports: [BoardsModule],
  controllers: [ListsController],
  providers: [ListsService, TenantGuard],
  exports: [ListsService],
})
export class ListsModule {}
