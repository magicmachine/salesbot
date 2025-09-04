import { Injectable, Logger } from '@nestjs/common';
import { TwitterApi } from 'twitter-api-v2';
import { AppConfigService } from '../config';
import { Sale } from '../types';
import * as https from 'https';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class TwitterService {
  private readonly _logger = new Logger(this.name);
  private readonly twitterClient: TwitterApi;

  get name(): string {
    return 'TwitterService';
  }

  constructor(protected readonly configService: AppConfigService) {
    this.twitterClient = new TwitterApi({
      appKey: this.configService.twitter.consumerKey,
      appSecret: this.configService.twitter.consumerSecret,
      accessToken: this.configService.twitter.accessTokenKey,
      accessSecret: this.configService.twitter.accessTokenSecret,
    });
  }

  /**
   * Tweet a sale with NFT image
   * @param sale Sale data to tweet
   */
  public async tweetSale(sale: Sale): Promise<any> {
    const tweetText = this.formatSaleTweet(sale);
    
    if (!this.configService.isDevelopment) {
      try {
        // Download the NFT image
        const imagePath = await this.downloadImage(sale.thumbnail, `sale-${sale.id}.png`);
        
        // Upload media to Twitter
        const mediaId = await this.twitterClient.v1.uploadMedia(imagePath);
        
        // Tweet with media
        const tweet = await this.twitterClient.v2.tweet({
          text: tweetText,
          media: { media_ids: [mediaId] }
        });
        
        this._logger.log(`Tweeted sale: ${sale.title}`);
        this._logger.log(`Tweet ID: ${tweet.data.id}`);
        
        // Clean up downloaded image
        fs.unlinkSync(imagePath);
        
        return tweet;
      } catch (err) {
        this._logger.error('Error tweeting sale:', err);
        throw err;
      }
    } else {
      this._logger.log(`[DEV MODE] Would tweet:\n${tweetText}`);
      return { data: { id: 'dev-mode' } };
    }
  }


  /**
   * Format a sale tweet
   * @param sale Sale data
   */
  private formatSaleTweet(sale: Sale): string {
    const priceStr = `${parseFloat(sale.tokenPrice.toFixed(4))} ${sale.tokenSymbol}`;
    const usdStr = sale.usdPrice ? ` (${sale.usdPrice})` : '';
    
    return `${sale.title} sold for ${priceStr}${usdStr}!`;
  }


  /**
   * Download an image from URL
   * @param url Image URL
   * @param filename Filename to save as
   */
  private async downloadImage(url: string, filename: string): Promise<string> {
    const tmpDir = path.join(__dirname, '../../tmp');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
    
    const filePath = path.join(tmpDir, filename);
    
    return new Promise((resolve, reject) => {
      const file = fs.createWriteStream(filePath);
      
      https.get(url, (response) => {
        response.pipe(file);
        
        file.on('finish', () => {
          file.close();
          resolve(filePath);
        });
      }).on('error', (err) => {
        fs.unlink(filePath, () => {}); // Delete the file on error
        reject(err);
      });
    });
  }
}

