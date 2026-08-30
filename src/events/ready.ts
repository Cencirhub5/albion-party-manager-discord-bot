import { Client, Events, ActivityType } from 'discord.js';
import { logger } from '../utils/logger.js';

export function setupReadyEvent(client: Client): void {
  client.once(Events.ClientReady, (c) => {
    logger.info(`🤖 Bot başarıyla giriş yaptı: ${c.user.tag}`);
    c.user.setActivity('Albion Online Partileri', { type: ActivityType.Watching });
  });
}
