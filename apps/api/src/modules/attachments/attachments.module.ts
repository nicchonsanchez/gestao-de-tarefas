import { Module } from '@nestjs/common';
import { BoardsModule } from '@/modules/boards/boards.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { AttachmentsController } from './attachments.controller';
import { AttachmentsService } from './attachments.service';

@Module({
  imports: [BoardsModule, StorageModule],
  controllers: [AttachmentsController],
  providers: [AttachmentsService],
})
export class AttachmentsModule {}
