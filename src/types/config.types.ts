/**
 * Application Config
 */
export interface AppConfig {
  bot: BotConfig;
  ethereum: EthereumConfig;
  discord: DiscordConfig;
  twitter: TwitterConfig;
  // collection config
  wizard: CollectionConfig;
  soul: CollectionConfig;
  warrior: CollectionConfig;
  pony: CollectionConfig;
  flame: CollectionConfig;
  lock: CollectionConfig;
  beast: CollectionConfig;
  spawn: CollectionConfig;
  babies: CollectionConfig;
  tricks: CollectionConfig;
  boxes: CollectionConfig;
  rings: CollectionConfig;
  athenaeum: CollectionConfig;
  runiverseitems: CollectionConfig;
}

/**
 * Bot config options
 */
export interface BotConfig {
  salesCheckCron: string;
  salesLookbackSeconds: number;
  reservoirSalesApiMainnet: string;
  reservoirSalesApiArbitrum: string;
  reservoirAsksApiMainnet: string;
  reservoirAsksApiArbitrum: string;
  reservoirApiKey: string;
  redisUri: string;
  forgottenBaseURI: string;
}

/**
 * Ethereum node config options
 */
export interface EthereumConfig {
  url: string;
  network: string;
}

/**
 * Wizards configuration
 */
export interface CollectionConfig {
  tokenContract: string;
  tokenAbi?: string;
  dataURI?: string;
  imageURI?: string;
  forgottenSlug?: string;
  chain?: 'arbitrum' | 'ethereum';
}

/**
 * Discord configuration
 */
export interface DiscordConfig {
  token: string;
  salesChannelIds: Array<string>;
  listingsChannelIds: Array<string>;
  prefix: string;
}

/**
 * Twitter api credentials
 */
export interface TwitterConfig {
  consumerKey: string;
  consumerSecret: string;
  accessTokenKey: string;
  accessTokenSecret: string;
}
