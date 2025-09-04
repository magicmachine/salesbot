import { Module } from '@nestjs/common';
import { DiscordService } from './discord.service';
import { AppConfigModule } from '../config';
<<<<<<< Updated upstream
import { DataStoreModule } from 'src/datastore';
import { EthereumModule } from 'src/ethereum';
import { ForgottenMarketModule } from 'src/markets';
=======
import { DataStoreModule } from '../datastore';
import { EthereumModule } from '../ethereum';
import { ForgottenMarketModule } from '../markets';
import { TwitterModule } from '../twitter';
>>>>>>> Stashed changes

@Module({
  imports: [
    AppConfigModule,
    DataStoreModule,
    EthereumModule,
    ForgottenMarketModule,
    TwitterModule,
  ],
  providers: [DiscordService],
  exports: [DiscordService],
})
export class DiscordModule {}
