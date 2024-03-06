import { Module } from '@nestjs/common';
import { AppConfigModule } from '../../config';
import { DataStoreModule } from '../../datastore';
import { EthereumModule } from '../../ethereum';
import { ForgottenMarketService } from './forgotten.service';

@Module({
  imports: [AppConfigModule, DataStoreModule, EthereumModule],
  providers: [ForgottenMarketService],
  exports: [ForgottenMarketService],
})
export class ForgottenMarketModule {}
