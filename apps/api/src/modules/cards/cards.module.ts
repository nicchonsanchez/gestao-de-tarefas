import { Module } from '@nestjs/common';

import { TenantGuard } from '@/common/tenant/tenant.guard';
import { BoardsModule } from '@/modules/boards/boards.module';

import { CardsService } from './cards.service';
import { CardsController } from './cards.controller';

@Module({
  imports: [BoardsModule],
  controllers: [CardsController],
  providers: [CardsService, TenantGuard],
  exports: [CardsService],
})
export class CardsModule {}
