import { Injectable, Logger } from '@nestjs/common';
import { AppConfigService } from '../config';
import { EthereumService } from '../ethereum';
import {
  TextChannel,
  EmbedBuilder,
  Client,
  GatewayIntentBits,
  APIEmbedField,
  APIEmbed,
} from 'discord.js';
import toRegexRange from 'to-regex-range';
import { CollectionConfig, Wizard, Sale, Item, Listing } from '../types';
import { ForgottenMarketService } from '../markets';
import { DataStoreService } from '../datastore';
import { CacheService } from '../cache';

@Injectable()
export class DiscordService {
  private readonly _logger = new Logger(DiscordService.name);
  private readonly _client = new Client({
    intents: GatewayIntentBits.GuildMessages,
  });
  private readonly _rangeRegex = new RegExp(`^${toRegexRange('0', '9999')}$`);

  protected _salesChannels: Array<TextChannel>;
  protected _listingsChannels: Array<TextChannel>;
  protected _recentTransactions: Array<string>;

  get name(): string {
    return 'DiscordService';
  }

  constructor(
    protected readonly configService: AppConfigService,
    protected readonly etherService: EthereumService,
    protected readonly dataStoreService: DataStoreService,
    protected readonly cacheService: CacheService,
    protected readonly forgottenMarket: ForgottenMarketService,
  ) {
    const { token, salesChannelIds } = this.configService.discord;
    this._client.login(token);
    this._client.on('ready', async () => {
      this._salesChannels = [];
      for (const channelId of salesChannelIds) {
        this._salesChannels.push(
          (await this._client.channels.fetch(channelId)) as TextChannel,
        );
      }
      this._listingsChannels = [];
      for (const channelId of this.configService.discord.listingsChannelIds) {
        this._listingsChannels.push(
          (await this._client.channels.fetch(channelId)) as TextChannel,
        );
      }
      this._recentTransactions = [];
    });
    this.channelWatcher();
  }

  /**
   * Check for Listings
   */
  public async checkListings(cs: CollectionConfig[]): Promise<void> {
    for (const c of cs) {
      await this.postListings(await this.forgottenMarket.getListings(c));
    }
  }

  /**
   * Post Listings
   */
  public async postListings(listings: Listing[]): Promise<void> {
    const groupedListingsMap: Record<string, Listing[]> = {};
    listings.forEach(listing => {
      if (groupedListingsMap[listing.id] == null) {
        groupedListingsMap[listing.id] = [];
      }
      groupedListingsMap[listing.id].push(listing);
    });

    const groupedListings = Object.entries(groupedListingsMap);

    for (const [, tokenListings] of groupedListings) {
      const marketFields: APIEmbedField[] = tokenListings
        .map(listing => {
          return [
            {
              name: '\u000A',
              value: '\u000A',
            },
            {
              name: 'Marketplace',
              value: `[${listing.market} ${
                listing.containsRoyalty ? '👑' : ''
              }](${listing.listingLink})`,
              inline: true,
            },
            {
              name: 'Price',
              value: `${parseFloat(listing.tokenPrice.toFixed(4))} ${
                listing.tokenSymbol
              } ${listing.usdPrice}`,
              inline: true,
            },
          ];
        })
        .flat();

      const embed: APIEmbed = {
        title: `${tokenListings[0].title}`,
        url: tokenListings[0].fmLink,
        thumbnail: {
          url: tokenListings[0].thumbnail,
        },
        fields: [
          {
            name: 'From',
            value: `[${listings[0].sellerAddr.slice(0, -34)}](${
              this.configService.bot.forgottenBaseURI
            }/portfolio/${listings[0].sellerAddr}) ${listings[0].sellerName}`,
            inline: false,
          },
          ...marketFields,
        ],
      };

      await this.postListing(embed);
    }
  }

  /**
   * Post Listing
   */
  public async postListing(embed: APIEmbed): Promise<void> {
    for (const channel of this._listingsChannels) {
      try {
        await channel.send({ embeds: [embed] });
      } catch (err) {
        this._logger.error(err);
      }
    }
  }

  /**
   * Check for Sales
   */
  public async checkSales(cs: CollectionConfig[]): Promise<void> {
    for (const c of cs) {
      await this.postSales(await this.forgottenMarket.getSales(c));
    }
  }

  /**
   * Post a sale
   */
  public async postSale(embed: EmbedBuilder): Promise<void> {
    for (const channel of this._salesChannels) {
      try {
        await channel.send({ embeds: [embed] });
      } catch (err) {
        this._logger.error(err);
      }
    }
  }

  /**
   * Post Sales
   */

  public async postSales(sales: Sale[]): Promise<void> {
    for (const sale of sales) {
      try {
        const embed = new EmbedBuilder()
          .setColor(sale.backgroundColor)
          .setTitle(sale.title)
          .setURL(sale.permalink)
          .setThumbnail(sale.thumbnail)
          .addFields(this.getSaleFields(sale))
          .setFooter({ text: sale.market, iconURL: sale.marketIcon });

        this._logger.log(`Posting sale to discord: ${sale.cacheKey}`);

        if (await this.cacheService.isCached(sale.cacheKey)) {
          this._logger.log(`Sale already posted to discord ${sale.cacheKey}`);
          break;
        } else {
          await this.cacheService.cacheSale(sale.cacheKey);
        }

        await this.postSale(embed);
      } catch (error) {
        this._logger.error(`Error posting sale to discord ${sale.cacheKey}`);
      }

      // wait to avoid rate limiting ?
      await this.sleep(300);
    }
  }

  /*
   * get standard fields for each sale
   */
  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public getSaleFields(sale: Sale): any[] {
    return [
      {
        name: 'Amount',
        value: `${parseFloat(sale.tokenPrice.toFixed(4))} ${sale.tokenSymbol} ${
          sale.usdPrice
        }`,
        inline: false,
      },
      {
        name: 'Royalties',
        value: `${sale.creatorRoyalties}%`,
        inline: false,
      },
      {
        name: 'Buyer',
        value: `[${sale.buyerAddr.slice(0, -34)}](${
          this.configService.bot.forgottenBaseURI
        }/portfolio/${sale.buyerAddr}) ${sale.buyerName}`,
        inline: true,
      },
      {
        name: 'Seller',
        value: `[${sale.sellerAddr.slice(0, -34)}](${
          this.configService.bot.forgottenBaseURI
        }/portfolio/${sale.sellerAddr}) ${sale.sellerName}`,
        inline: true,
      },
    ];
  }

  public getListingFields(listing: Listing): APIEmbedField[] {
    return [
      {
        name: 'Price',
        value: `${parseFloat(listing.tokenPrice.toFixed(4))} ${
          listing.tokenSymbol
        } ${listing.usdPrice}`,
        inline: false,
      },
      {
        name: 'From',
        value: `[${listing.sellerAddr.slice(0, -34)}](${
          this.configService.bot.forgottenBaseURI
        }/portfolio/${listing.sellerAddr}) ${listing.sellerName}`,
        inline: true,
      },
    ];
  }

  /*
   * watch channel for requests for data
   */
  public async channelWatcher(): Promise<void> {
    const { prefix } = this.configService.discord;
    this._client.on('message', async message => {
      if (message.author.bot) return;
      if (!message.content.startsWith(prefix)) return;
      if (this.configService.isDevelopment) {
        if (message.channel.id != '843121547358109700') return;
      }
      const commandBody = message.content.slice(prefix.length);
      const args = commandBody.split(' ');
      const id = args[0].toLowerCase();

      const collection = args[1];
      let embed: EmbedBuilder;

      switch (collection) {
        case 'pony':
        case 'ponies':
          embed = await this.getEmbed(
            await this.dataStoreService.getPony(id),
            this.configService.pony,
          );
          break;
        case 'beast':
        case 'beasts':
          embed = await this.getEmbed(
            await this.dataStoreService.getBeast(id),
            this.configService.beast,
          );
          break;
        case 'spawn':
        case 'spawns':
          embed = await this.getEmbed(
            await this.dataStoreService.getSpawn(id),
            this.configService.spawn,
          );
          break;
        case 'lock':
        case 'locks':
          embed = await this.getEmbed(
            await this.dataStoreService.getLock(id),
            this.configService.lock,
          );
          break;
        case 'warrior':
        case 'warriors':
          embed = await this.getEmbed(
            await this.dataStoreService.getWarrior(id),
            this.configService.warrior,
          );
          break;
        default:
          if (!this._rangeRegex.test(id)) {
            this._logger.log(`Item out of range`);
            return;
          }
          if (await this.dataStoreService.checkSoul(id)) {
            embed = await this.getEmbed(
              await this.dataStoreService.getSoul(id),
              this.configService.soul,
            );
          } else {
            const wizard: Wizard = await this.dataStoreService.getWizard(id);
            wizard.traits = this.dataStoreService.getWizardFields(wizard);
            embed = await this.getEmbed(wizard, this.configService.wizard);
          }
          break;
      }
      if (embed === undefined) {
        return;
      }
      try {
        this._logger.log(`Posting ${collection} (${id})`);
        message.reply({ embed: embed });
      } catch (error) {
        this._logger.error(`error posting wizard ${id}, ${error}`);
        return;
      }
    });
  }

  public async sleep(ms: number): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  public async getEmbed(i: Item, c: CollectionConfig): Promise<EmbedBuilder> {
    if (i === undefined) {
      return;
    }
    return new EmbedBuilder()
      .setColor(i.backgroundColor)
      .setAuthor({
        name: `${i.name} (#${i.serial})`,
        iconURL:
          'https://cdn.discordapp.com/app-icons/843121928549957683/af28e4f65099eadebbb0635b1ea8d0b2.png?size=64',
        url: `${this.configService.bot.forgottenBaseURI}/${c.tokenContract}/${i.serial}`,
      })
      .setURL(
        `${this.configService.bot.forgottenBaseURI}/${c.tokenContract}/${i.serial}`,
      )
      .setThumbnail(`${c.imageURI}/${i.serial}.png`)
      .addFields(i.traits);
  }
}
