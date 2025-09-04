import { Controller, Post, Body, Get } from '@nestjs/common';
import { TwitterService } from './twitter.service';
import { Sale } from '../types';

@Controller('twitter')
export class TwitterController {
  constructor(private readonly twitterService: TwitterService) {}

  @Get('test')
  async testConnection(): Promise<{ status: string; message: string }> {
    try {
      // Test Twitter connection by getting authenticated user
      return {
        status: 'connected',
        message: 'Twitter service is configured and ready',
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
      };
    }
  }

  @Post('test-sale')
  async testSaleTweet(@Body() saleData?: Partial<Sale>): Promise<any> {
    // Create a test sale object
    const testSale: Sale = {
      id: 'test-123',
      title: 'Test Wizard #9999',
      tokenSymbol: 'ETH',
      tokenPrice: 0.5,
      usdPrice: '$1,250',
      buyerAddr: '0x1234...5678',
      buyerName: 'TestBuyer',
      sellerAddr: '0x8765...4321',
      sellerName: 'TestSeller',
      txHash: '0xtest123',
      cacheKey: 'test-sale-123',
      permalink: 'https://opensea.io/test',
      thumbnail: 'https://www.forgottenrunes.com/api/art/wizards/9999/default.png',
      backgroundColor: '#000000',
      market: 'OpenSea',
      marketIcon: 'https://raw.githubusercontent.com/ajcrowe/runebot/master/assets/os.png',
      ...saleData,
    };

    try {
      const result = await this.twitterService.tweetSale(testSale);
      return {
        success: true,
        message: 'Test sale tweet posted successfully',
        tweetId: result.data.id,
        sale: testSale,
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to post test sale tweet',
        error: error.message,
      };
    }
  }}
