import { Module } from '@nestjs/common';

import { TenantGuard } from '@/common/tenant/tenant.guard';
import { BoardsModule } from '@/modules/boards/boards.module';

import { TimeTrackingService } from './time-tracking.service';
import { TimeTrackingController } from './time-tracking.controller';

@Module({
  imports: [BoardsModule],
  controllers: [TimeTrackingController],
  providers: [TimeTrackingService, TenantGuard],
  exports: [TimeTrackingService],
})
export class TimeTrackingModule {}
