import {
  CollectionConfig,
  Sale,
  Market,
  MarketIcons,
  MarketMetaData,
  MarketURI,
  Item,
  Listing,
} from '../../types';
import { MarketService } from '../market.service';
import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../../config';
import { EthereumService } from '../../ethereum';
import { DataStoreService } from '../../datastore';
import { CacheService } from '../../cache';
import axios, { AxiosResponse } from 'axios';
import { BigNumber } from 'ethers';

@Injectable()
export class ForgottenMarketService extends MarketService {
  private readonly _logger = new Logger(ForgottenMarketService.name);

  constructor(
    protected readonly configService: AppConfigService,
    protected readonly cacheService: CacheService,
    protected readonly etherService: EthereumService,
    protected readonly dataStoreService: DataStoreService,
  ) {
    super();
  }

  get name(): string {
    return 'ForgottenMarketService';
  }

  /**
   * Get OS listings for specific collection
   */
  public async getListings(collection: CollectionConfig): Promise<Listing[]> {
    let items: Array<Listing> = [];
    try {
      this._logger.log(
        `Checking for listings ${collection.forgottenSlug}/Forgotten`,
      );

      // https://forgotten.market/api/orders/asks/v5?tokenSetId=contract:0x9690b63eb85467be5267a3603f770589ab12dc95
      const response: AxiosResponse = await axios.get(
        `${
          collection.chain === 'arbitrum'
            ? this.configService.bot.reservoirAsksApiArbitrum
            : this.configService.bot.reservoirAsksApiMainnet
        }?tokenSetId=contract:${collection.tokenContract}`,
        {
          method: 'get',

          timeout: 10000,
        },
      );
      if (response.data.orders.length) {
        items = await this.createListings(response.data.orders, collection);
        this._logger.log(
          `Found ${items.length} listings ${collection.forgottenSlug}/Forgotten`,
        );
      } else {
        this._logger.log(`No listings ${collection.forgottenSlug}/Forgotten`);
      }
    } catch (err) {
      this._logger.error(
        `${err} (${collection.forgottenSlug}/Forgotten) listings`,
      );
    } finally {
      return items.reverse();
    }
  }

  /**
   * Get OS sales for specific collection
   */
  public async getSales(collection: CollectionConfig): Promise<Sale[]> {
    let sales: Array<Sale> = [];
    try {
      this._logger.log(
        `Checking for sales ${collection.forgottenSlug}/Forgotten`,
      );

      const headers = {
        Accept: 'application/json',
      };

      if (collection.chain === 'arbitrum') {
        headers['x-api-key'] = 'demo-api-key';
      }

      const response: AxiosResponse = await axios.get(
        `${
          collection.chain === 'arbitrum'
            ? this.configService.bot.reservoirSalesApiArbitrum
            : this.configService.bot.reservoirSalesApiMainnet
        }?includeTokenMetadata=true&collection=${collection.tokenContract}`,
        {
          method: 'get',

          timeout: 10000,
        },
      );
      if (response.data.sales.length) {
        sales = await this.createSales(response.data.sales, collection);
        this._logger.log(
          `Found ${sales.length} sales ${collection.forgottenSlug}/Forgotten`,
        );
      } else {
        this._logger.log(`No sales ${collection.forgottenSlug}/Forgotten`);
      }
    } catch (err) {
      this._logger.error(
        `${err} (${collection.forgottenSlug}/Forgotten) sales`,
      );
    } finally {
      return sales.reverse();
    }
  }

  /**
   * Process json response into Sale[] object
   */
  async createSales(
    forgottenSales: any[],
    c: CollectionConfig,
  ): Promise<Sale[]> {
    const sales: Array<Sale> = [];
    for (const sale of forgottenSales) {
      const market: MarketMetaData = await this.getMarketMetaData(
        sale.fillSource,
      );
      const cacheKey = `${sale.txHash}:${sale.token.tokenId}`;
      const time = Date.now() / 1000 - sale.timestamp;
      if (time < this.configService.bot.salesLookbackSeconds) {
        // check if sale already in broadcast
        if (await this.cacheService.isCached(cacheKey)) {
          continue;
        }

        const buyerName = await this.etherService.getDomain(sale.to);
        const sellerName = await this.etherService.getDomain(sale.from);

        let name = sale?.token?.name;
        let thumbnail = sale?.token?.image;

        if (!name) {
          this._logger.log(`No name  in sale data, fetching individually`);

          const item: Item = await this.dataStoreService.getItemByContract(
            sale.token.tokenId,
            c.tokenContract,
          );

          this._logger.debug(item);

          name = item.name;
        }

        // Ruinverse Items hack
        if (
          name?.startsWith('Bronze Quantum Gift') ||
          name?.startsWith('Silver Quantum Gift')
        ) {
          continue;
        }

        name = this.getName(name);

        if (!thumbnail) {
          thumbnail = `${c.imageURI}/${sale.token.tokenId}.png`;
        }

        // sum up royalties
        const royalties = BigNumber.from(0);
        if (sale.feeBreakdown) {
          for (const fee of sale.feeBreakdown) {
            if (
              fee.kind === 'royalty' ||
              fee.recipient.toLowerCase() ===
                '0xc4fd73a45738291853a0937a31554f9a1dc42903'.toLowerCase() // special fee recipient override for gnosis safe (should make configurable)
            ) {
              royalties.add(BigNumber.from(fee.rawAmount));
            }
          }
        }

        try {
          sales.push({
            id: sale.token.tokenId,
            title: `${name} ${
              sale.token.tokenId.length < 8 ? `(#${sale.token.tokenId})` : ''
            } ${sale.orderSide === 'bid' ? '🔴' : '🟢'}`,
            tokenSymbol: sale.price.currency.symbol,
            tokenPrice: sale.price.amount.native,
            usdPrice: `(${sale.price.amount.usd.toFixed(2)} USD)`,
            buyerAddr: sale.to,
            buyerName: buyerName ? `(${buyerName})` : ``,
            sellerAddr: sale.from,
            sellerName: sellerName ? `(${sellerName})` : ``,
            txHash: sale.txHash,
            cacheKey: cacheKey,
            permalink: `https://forgotten.market/${c.tokenContract}/${sale.token.tokenId}`,
            thumbnail,
            backgroundColor: '#000000',
            market: market.name,
            marketIcon: market.icon,
            creatorRoyalties: (
              royalties
                .mul(BigNumber.from(10000))
                .div(BigNumber.from(sale.price.amount.raw))
                .toNumber() / 100
            ).toString(),
          });
        } catch (err) {
          this._logger.error(`${err}  ${market}`);
          this._logger.debug(market);
        }
      }
    }
    return sales.reverse();
  }

  getName(name: string | undefined): string {
    return name?.replace(/\(Item ID:.*\)$/, '');
  }

  shouldSkipListing(cachedListing: Listing, listing: Listing): boolean {
    let skip = false;
    if (cachedListing != null) {
      const previousPrice = cachedListing.tokenPrice;
      // exclude if price diff is less than 10%
      if (
        listing.tokenPrice <= previousPrice &&
        listing.tokenPrice > 0.9 * previousPrice
      ) {
        skip = true;
      }
    }
    return skip;
  }

  /**
   *  Process json into Listing[] object
   */
  async createListings(
    forgottenListings: any[],
    c: CollectionConfig,
  ): Promise<Listing[]> {
    const listings: Array<Listing> = [];
    for (const listing of forgottenListings) {
      const [, , tokenId] = listing.tokenSetId.split(':');
      const market = this.getMarketMetaData(listing.source.domain);
      const cacheKey = `${listing.tokenSetId}:${market.name}`;

      const time = (Date.now() - new Date(listing.updatedAt).getTime()) / 1000;
      if (time < this.configService.bot.salesLookbackSeconds) {
        const sellerName = await this.etherService.getDomain(listing.maker);
        const item: Item = await this.dataStoreService.getItemByContract(
          tokenId,
          c.tokenContract,
        );

        this._logger.debug(item);

        // Runiverse Items hack
        if (
          item.name?.startsWith('Bronze Quantum Gift') ||
          item.name?.startsWith('Silver Quantum Gift')
        ) {
          continue;
        }

        const name = this.getName(item.name);
        const thumbnail = `${c.imageURI}/${tokenId}.png`;

        this._logger.log(`Listing: ${JSON.stringify(listing)}`);

        const containsRoyalty = listing.feeBreakdown.some(
          (fee: any) => fee.kind === 'royalty' && fee.bps > 0,
        );

        try {
          const formattedListing = {
            id: tokenId,
            title: `${name} ${tokenId.length < 8 ? `(#${tokenId})` : ''}`,
            containsRoyalty,
            tokenSymbol: listing.price.currency.symbol,
            tokenPrice: listing.price.amount.native,
            usdPrice: `(${listing.price.amount.usd.toFixed(2)} USD)`,
            sellerAddr: listing.maker,
            sellerName: sellerName ? `(${sellerName})` : ``,
            cacheKey,
            fmLink: `https://forgotten.market/${c.tokenContract}/${tokenId}`,
            listingLink: listing.source.url,
            thumbnail,
            backgroundColor: '#000000' as const,
            market: market.name,
            marketIcon: market.icon,
          };

          const cacheResult = ((await this.cacheService.getCachedListing(
            cacheKey,
          )) as unknown) as Listing;

          if (cacheResult) {
            const skip = this.shouldSkipListing(cacheResult, formattedListing);
            this.cacheService.cacheListing(cacheKey, formattedListing);
            if (skip) {
              continue;
            }
          } else {
            this.cacheService.cacheListing(cacheKey, formattedListing);
          }

          listings.push(formattedListing);
        } catch (err) {
          this._logger.error(`${err}  ${market}`);
          this._logger.debug(market);
        }
      }
    }
    return listings.reverse();
  }

  getMarketMetaData(marketName: string): MarketMetaData {
    switch (marketName) {
      case MarketURI.OPENSEA:
        return {
          name: Market.OPENSEA,
          icon: MarketIcons.OPENSEA,
          uri: MarketURI.OPENSEA,
        };
      case MarketURI.BLUR:
        return {
          name: Market.BLUR,
          icon: MarketIcons.BLUR,
          uri: MarketURI.BLUR,
        };
      case MarketURI.LOOKSRARE:
        return {
          name: Market.LOOKSRARE,
          icon: MarketIcons.LOOKSRARE,
          uri: MarketURI.LOOKSRARE,
        };
      case MarketURI.NFTX:
        return {
          name: Market.NFTX,
          icon: MarketIcons.NFTX,
          uri: MarketURI.NFTX,
        };
      case MarketURI.ZAAR:
        return {
          name: Market.ZAAR,
          icon: MarketIcons.ZAAR,
          uri: MarketURI.ZAAR,
        };
      case MarketURI.GEM || MarketURI.OPENSEAPRO:
        return {
          name: Market.GEM,
          icon: MarketIcons.GEM,
          uri: MarketURI.GEM,
        };
      case MarketURI.X2Y2:
        return {
          name: Market.X2Y2,
          icon: MarketIcons.X2Y2,
          uri: MarketURI.X2Y2,
        };
      case MarketURI.SUDOSWAP:
        return {
          name: Market.SUDOSWAP,
          icon: MarketIcons.SUDOSWAP,
          uri: MarketURI.SUDOSWAP,
        };
    }
    // return default for everything else
    return {
      name: Market.FORGOTTEN,
      icon: MarketIcons.FORGOTTEN,
      uri: MarketURI.FORGOTTEN,
    };
  }
}
