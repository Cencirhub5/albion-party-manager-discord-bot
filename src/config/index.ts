import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export interface BotConfig {
  discordToken: string;
  clientId: string;
  guildId?: string;
  databasePath: string;
  logLevel: string;
}

export const config: BotConfig = {
  discordToken: process.env.DISCORD_TOKEN || '',
  clientId: process.env.CLIENT_ID || '',
  guildId: process.env.GUILD_ID || undefined,
  databasePath: process.env.DATABASE_PATH || path.resolve(process.cwd(), 'data', 'party_bot.sqlite'),
  logLevel: process.env.LOG_LEVEL || 'info',
};
