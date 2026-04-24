import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { StorageModule } from '@/modules/storage/storage.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';

@Module({
  imports: [forwardRef(() => AuthModule), StorageModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
