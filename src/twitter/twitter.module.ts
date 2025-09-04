import { Module } from '@nestjs/common';
import { TwitterService } from './twitter.service';
import { AppConfigModule } from '../config';
import { CacheModule } from '../cache';

@Module({
  imports: [AppConfigModule, CacheModule],
  providers: [TwitterService],
  exports: [TwitterService],
})
export class TwitterModule {}
