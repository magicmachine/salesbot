import { Injectable, Logger } from '@nestjs/common';
import { TwitterApi } from 'twitter-api-v2';
import { AppConfigService } from '../config';
import { DailyTweet, Sale } from '../types';
import { CacheService } from '../cache';
import axios from 'axios';

@Injectable()
export class TwitterService {
  private readonly _logger = new Logger(this.name);
  private readonly twitterClient: TwitterApi;

  get name(): string {
    return 'TwitterService';
  }

  constructor(
    protected readonly configService: AppConfigService,
    protected readonly cacheService: CacheService,
  ) {
    // Initialize Twitter client with OAuth 1.0a credentials
    this.twitterClient = new TwitterApi({
      appKey: this.configService.twitter.consumerKey,
      appSecret: this.configService.twitter.consumerSecret,
      accessToken: this.configService.twitter.accessTokenKey,
      accessSecret: this.configService.twitter.accessTokenSecret,
    });
  }

  /**
   * Post a sale to Twitter with image
   * @param sale Sale object containing transaction details
   */
  public async postSale(sale: Sale): Promise<void> {
    try {
      // Format: NAME OF TOKEN (#ID) sold for 0.02 ETH (74.31 USD)!
      const status = `${sale.title} sold for ${parseFloat(sale.tokenPrice.toFixed(4))} ${sale.tokenSymbol} ${sale.usdPrice}!`;
      
      this._logger.log(`Posting sale to Twitter: ${sale.cacheKey}`);

      // Check if already posted
      const twitterCacheKey = `twitter:${sale.cacheKey}`;
      if (await this.cacheService.isCached(twitterCacheKey)) {
        this._logger.log(`Sale already posted to Twitter ${sale.cacheKey}`);
        return;
      }

      if (!this.configService.isDevelopment) {
        try {
          let mediaId: string | undefined;
          
          // Download and upload image if available
          if (sale.thumbnail) {
            try {
              this._logger.log(`Downloading image from: ${sale.thumbnail}`);
              
              // Download image
              const imageResponse = await axios.get(sale.thumbnail, {
                responseType: 'arraybuffer'
              });
              
              // Convert to Buffer
              const imageBuffer = Buffer.from(imageResponse.data);
              
              // Upload to Twitter
              this._logger.log(`Uploading image to Twitter...`);
              
              // Determine MIME type based on URL or content
              let mimeType = 'image/png';
              if (sale.thumbnail.toLowerCase().includes('.jpg') || sale.thumbnail.toLowerCase().includes('.jpeg')) {
                mimeType = 'image/jpeg';
              } else if (sale.thumbnail.toLowerCase().includes('.gif')) {
                mimeType = 'image/gif';
              } else if (sale.thumbnail.toLowerCase().includes('.webp')) {
                mimeType = 'image/webp';
              }
              
              mediaId = await this.twitterClient.v1.uploadMedia(imageBuffer, {
                mimeType,
                target: 'tweet',
              });
              
              this._logger.log(`Image uploaded successfully, media ID: ${mediaId}`);
            } catch (imageError) {
              this._logger.error(`Error uploading image: ${imageError}`);
              // Continue without image if upload fails
            }
          }
          
          // Post tweet with or without media
          const tweetData: any = { text: status };
          if (mediaId) {
            tweetData.media = { media_ids: [mediaId] };
          }
          
          const tweet = await this.twitterClient.v2.tweet(tweetData);
          this._logger.log(`Successfully tweeted: ${tweet.data.id} - ${status}`);
          
          // Cache to prevent duplicate posts
          await this.cacheService.cacheSale(twitterCacheKey);
        } catch (err) {
          this._logger.error(`Error posting to Twitter: ${err}`);
        }
      } else {
        this._logger.log(`[DEV MODE] Would tweet: ${status}`);
        if (sale.thumbnail) {
          this._logger.log(`[DEV MODE] Would include image: ${sale.thumbnail}`);
        }
        // Still cache in dev mode to prevent spam in logs
        await this.cacheService.cacheSale(twitterCacheKey);
      }
    } catch (error) {
      this._logger.error(`Error posting sale to Twitter ${sale.cacheKey}: ${error}`);
    }
  }

  /**
   * Post multiple sales to Twitter
   * @param sales Array of sales to post
   */
  public async postSales(sales: Sale[]): Promise<void> {
    for (const sale of sales) {
      await this.postSale(sale);
      // Add delay to avoid rate limiting
      await this.sleep(1000); // 1 second delay between tweets
    }
  }

  /**
   * Sleep helper function
   */
  private async sleep(ms: number): Promise<any> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Tweet daily Wizard data (legacy method)
   * @param data populated tweet data object
   */
  public async tweet(data: DailyTweet): Promise<any> {
    const status = this.formatTweet(data);
    if (!this.configService.isDevelopment) {
      try {
        const tweet = await this.twitterClient.v2.tweet(status);
        this._logger.log(`Tweeted: ${tweet.data.id} - ${status}`);
      } catch (err) {
        this._logger.error(err);
      }
    } else {
      console.log(status);
    }
  }

  /**
   * Format the status update using the data
   * @param data populated supply data object
   */
  formatTweet(data: DailyTweet): string {
    //todo
    console.log(data);
    return `tweet...`;
  }
}
