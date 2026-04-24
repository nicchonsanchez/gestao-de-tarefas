import { Module } from '@nestjs/common';
import { BoardsModule } from '@/modules/boards/boards.module';
import { ChecklistsController } from './checklists.controller';
import { ChecklistsService } from './checklists.service';

@Module({
  imports: [BoardsModule],
  controllers: [ChecklistsController],
  providers: [ChecklistsService],
})
export class ChecklistsModule {}
