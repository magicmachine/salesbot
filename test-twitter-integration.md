# Twitter Integration Test Plan

## Build Status
✅ Project builds successfully without errors

## Integration Points

### 1. Twitter Service (`src/twitter/twitter.service.ts`)
- ✅ Updated to use `twitter-api-v2` library
- ✅ Implements `postSale()` method with correct format
- ✅ Implements caching to prevent duplicates
- ✅ Has rate limiting protection (1 second between tweets)

### 2. Discord Service (`src/discord/discord.service.ts`)
- ✅ Injects TwitterService
- ✅ Calls `twitterService.postSale()` after posting to Discord
- ✅ Has error handling so Twitter failures don't affect Discord

### 3. Configuration
- ✅ Twitter API keys are configured via environment variables:
  - `TWITTER_CONSUMER_KEY`
  - `TWITTER_CONSUMER_SECRET`
  - `TWITTER_ACCESS_KEY`
  - `TWITTER_ACCESS_SECRET`

## Testing in Development Mode

When running in development mode (`APP_ENVIRONMENT=development`), the Twitter service will:
- Log what would be tweeted without actually posting
- Still cache the "posts" to prevent log spam
- Show format: `[DEV MODE] Would tweet: {message}`

## Expected Tweet Format

```
NAME OF TOKEN (#ID) sold for 0.02 ETH ($74.31 USD)!
```

Example:
```
Wizard #12345 sold for 0.02 ETH ($74.31 USD)!
```

## How Sales Flow Works

1. Cron job runs every minute (configurable via `SALES_CHECK_CRON`)
2. `AppService` triggers `DiscordService.checkSales()`
3. `ForgottenMarketService.getSales()` fetches recent sales
4. For each sale:
   - Posts to Discord channels
   - Posts to Twitter
   - Both use caching to prevent duplicates

## Monitoring

Watch the logs for:
- `Running Sales Checker Job` - Indicates cron is running
- `Posting sale to discord: {cacheKey}` - Sale being processed
- `Posting sale to Twitter: {cacheKey}` - Twitter post attempt
- `[DEV MODE] Would tweet: {message}` - Development mode output
- `Successfully tweeted: {id} - {message}` - Production success

## Rate Limiting

- Twitter API v2 has rate limits
- Implementation includes 1 second delay between tweets
- Errors are logged but don't stop the process
