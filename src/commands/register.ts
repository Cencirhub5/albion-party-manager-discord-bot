import { REST, Routes } from 'discord.js';
import { config } from '../config/index.js';
import { partyCommand } from './party.js';
import { templateCommand } from './template.js';
import { logger } from '../utils/logger.js';

async function registerSlashCommands() {
  if (!config.discordToken || !config.clientId) {
    logger.error('DISCORD_TOKEN veya CLIENT_ID eksik. Lütfen .env dosyasını kontrol edin.');
    process.exit(1);
  }

  const rest = new REST({ version: '10' }).setToken(config.discordToken);
  const commandsData = [
    partyCommand.data.toJSON(),
    templateCommand.data.toJSON(),
  ];

  try {
    logger.info('Slash komutları Discord API üzerine kaydediliyor...');

    if (config.guildId) {
      // Geliştirme modu: Belirli sunucuya anında kaydet
      logger.info(`Komutlar sunucuya kaydediliyor (Guild ID: ${config.guildId})`);
      await rest.put(
        Routes.applicationGuildCommands(config.clientId, config.guildId),
        { body: commandsData }
      );
    } else {
      // Global kayıt
      logger.info('Komutlar Global olarak kaydediliyor...');
      await rest.put(
        Routes.applicationCommands(config.clientId),
        { body: commandsData }
      );
    }

    logger.info('Tüm Slash komutları (/party, /template) başarıyla kaydedildi!');
  } catch (error) {
    logger.error('Komutlar kaydedilirken hata oluştu:', error);
  }
}

registerSlashCommands();
