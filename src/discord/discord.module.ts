import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { AppConfigModule } from '../config';
import { DataStoreModule } from '../datastore';
import { EthereumModule } from '../ethereum';
import { ForgottenMarketModule } from '../markets';

@Module({
  imports: [
    AppConfigModule,
    DataStoreModule,
    EthereumModule,
    ForgottenMarketModule,
  ],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
