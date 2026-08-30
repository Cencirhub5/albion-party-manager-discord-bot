import { Client, Events, Interaction } from 'discord.js';
import { commands } from '../commands/index.js';
import { ButtonHandler } from '../handlers/buttonHandler.js';
import { SelectMenuHandler } from '../handlers/selectMenuHandler.js';
import { ModalHandler } from '../handlers/modalHandler.js';
import { logger } from '../utils/logger.js';

export function setupInteractionEvent(client: Client): void {
  client.on(Events.InteractionCreate, async (interaction: Interaction) => {
    try {
      // 1. Slash Komutları
      if (interaction.isChatInputCommand()) {
        const command = commands.get(interaction.commandName);
        if (!command) {
          logger.warn(`Kayıtsız komut çağrıldı: ${interaction.commandName}`);
          return;
        }

        const res = await command.execute(interaction);
        logger.debug(`Slash komut sonucu (${interaction.commandName}):`, res);
        return;
      }

      // 2. Autocomplete (Otomatik Tamamlama) Etkileşimleri
      if (interaction.isAutocomplete()) {
        const command = commands.get(interaction.commandName);
        if (command && typeof command.autocomplete === 'function') {
          await command.autocomplete(interaction);
        }
        return;
      }

      // 3. Buton Etkileşimleri
      if (interaction.isButton()) {
        const res = await ButtonHandler.handleButton(interaction);
        logger.debug(`Buton etkileşim sonucu (${interaction.customId}):`, res);
        return;
      }

      // 4. User Select Menu Etkileşimleri
      if (interaction.isUserSelectMenu()) {
        const res = await SelectMenuHandler.handleUserSelect(interaction);
        logger.debug(`UserSelect etkileşim sonucu (${interaction.customId}):`, res);
        return;
      }

      // 5. Modal Gönderimleri
      if (interaction.isModalSubmit()) {
        const res = await ModalHandler.handleModalSubmit(interaction);
        logger.debug(`Modal submit sonucu (${interaction.customId}):`, res);
        return;
      }
    } catch (error: any) {
      logger.error('Interaction işlenirken beklenmeyen hata meydana geldi:', error);
    }
  });
}
