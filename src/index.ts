import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { config } from './config/index.js';
import { initializeDatabaseSchema } from './database/schema.js';
import { setupReadyEvent } from './events/ready.js';
import { setupInteractionEvent } from './events/interactionCreate.js';
import { logger } from './utils/logger.js';

async function startBot() {
  logger.info('Albion Online Party Bot başlatılıyor...');

  // 1. Veritabanı şemasını başlat
  try {
    initializeDatabaseSchema();
  } catch (dbErr) {
    logger.error('Veritabanı başlatılamadı:', dbErr);
    process.exit(1);
  }

  // 2. Discord Client oluştur
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.GuildMembers,
    ],
    partials: [Partials.Message, Partials.Channel, Partials.Reaction],
  });

  // 3. Olayları (Events) bağla
  setupReadyEvent(client);
  setupInteractionEvent(client);

  // 4. Discord'a bağlan
  if (!config.discordToken) {
    logger.warn('DISCORD_TOKEN tanımlanmadı. Lütfen .env dosyasını yapılandırın.');
    logger.info('Bot veritabanı ve komut modülleri hazır olarak bekliyor.');
    return;
  }

  try {
    await client.login(config.discordToken);
  } catch (loginErr) {
    logger.error('Discord API oturum açma hatası:', loginErr);
    process.exit(1);
  }
}

// Uygulama sonlandığında veritabanı ve kaynakları temizle
process.on('SIGINT', () => {
  logger.info('Uygulama durduruluyor (SIGINT)...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info('Uygulama durduruluyor (SIGTERM)...');
  process.exit(0);
});

startBot();
