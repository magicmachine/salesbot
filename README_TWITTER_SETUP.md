# Twitter/X Integration Setup

This salesbot now supports automatically posting NFT sales and listings to Twitter/X.

## Prerequisites

1. Twitter Developer Account
2. Twitter API v2 access
3. App with Read and Write permissions

## Environment Variables

Add the following environment variables to your `.env` file:

```env
# Twitter API Credentials
TWITTER_CONSUMER_KEY=your_consumer_key_here
TWITTER_CONSUMER_SECRET=your_consumer_secret_here
TWITTER_ACCESS_KEY=your_access_token_here
TWITTER_ACCESS_SECRET=your_access_token_secret_here
```

## Getting Twitter API Credentials

1. Go to [Twitter Developer Portal](https://developer.twitter.com/)
2. Create a new App or use an existing one
3. Navigate to your app's "Keys and tokens" section
4. Generate the following:
   - API Key and Secret (Consumer Key/Secret)
   - Access Token and Secret

Make sure your app has **Read and Write** permissions to post tweets.

## Features

- **Automatic Sales Tweets**: When an NFT sale is detected and posted to Discord, the bot will automatically tweet with:
  - NFT title and sale price
  - Marketplace information
  - Buyer and seller names (if available)
  - NFT thumbnail image
  - Direct link to the sale

## Tweet Format Examples

### Sale Tweet:
```
John Calamity of the Ruins (#5106) sold for 0.02 ETH (74.31 USD)!
```

The tweet will also include the NFT image attached.

## Testing

To test Twitter posting without actually tweeting:

1. Set `APP_ENVIRONMENT=development` in your `.env` file
2. The bot will log what it would tweet instead of posting

## Rate Limits

The bot automatically handles rate limiting by spacing out tweets. Twitter API v2 allows:
- 300 tweets per 3 hours for the free tier
- Higher limits for paid tiers

## Troubleshooting

1. **Authentication errors**: Double-check your API credentials
2. **Permission errors**: Ensure your app has Read and Write permissions
3. **Image upload failures**: Check that the NFT thumbnail URLs are accessible
4. **Rate limit errors**: The bot will log these and continue with the next sale
