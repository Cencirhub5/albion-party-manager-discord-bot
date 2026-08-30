import {
  ModalSubmitInteraction,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  MessageFlags,
} from 'discord.js';
import { MemberRepository } from '../database/repositories/memberRepository.js';
import { PartyService } from '../services/partyService.js';
import { buildPartyEmbed } from '../components/partyEmbed.js';
import { buildPartyButtons } from '../components/partyButtons.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export class ModalHandler {
  /**
   * Build notu modal penceresini oluşturur
   */
  static createBuildNoteModal(partyId: number, currentNote?: string | null): ModalBuilder {
    const modal = new ModalBuilder()
      .setCustomId(`party:modal_note:${partyId}`)
      .setTitle('Build / Ekipman Notu');

    const noteInput = new TextInputBuilder()
      .setCustomId('build_note_input')
      .setLabel('Silah / Build / Rol Notunuz')
      .setPlaceholder('Örn: 1H Mace / Incubus / Fallen Staff')
      .setStyle(TextInputStyle.Short)
      .setMaxLength(50)
      .setRequired(true);

    if (currentNote) {
      noteInput.setValue(currentNote);
    }

    const row = new ActionRowBuilder<TextInputBuilder>().addComponents(noteInput);
    modal.addComponents(row);

    return modal;
  }

  /**
   * Modal gönderimini işler
   */
  static async handleModalSubmit(interaction: ModalSubmitInteraction): Promise<CommandResponse<void>> {
    const customId = interaction.customId;

    if (!customId.startsWith('party:modal_note:')) {
      return errorResponse('Bilinmeyen modal işlemi.');
    }

    const partyId = parseInt(customId.split(':')[2], 10);
    const note = interaction.fields.getTextInputValue('build_note_input').trim();

    try {
      const member = MemberRepository.findMember(partyId, interaction.user.id);
      if (!member) {
        await interaction.reply({
          content: '❌ Not eklemek için önce partiye katılmalısınız.',
          flags: MessageFlags.Ephemeral,
        });
        return errorResponse('Kullanıcı partide değil.');
      }

      MemberRepository.updateNote(partyId, interaction.user.id, note);

      const partyRes = PartyService.getParty(partyId);
      if (partyRes.success && partyRes.data) {
        const party = partyRes.data;
        if (interaction.message) {
          try {
            await interaction.message.edit({
              embeds: [buildPartyEmbed(party)],
              components: buildPartyButtons(party.id, party.is_locked === 1),
            });
          } catch (mErr) {
            logger.warn('Modal message.edit hatası:', mErr);
          }
        } else if (party.message_id && interaction.channel) {
          try {
            const message = await interaction.channel.messages.fetch(party.message_id);
            if (message) {
              await message.edit({
                embeds: [buildPartyEmbed(party)],
                components: buildPartyButtons(party.id, party.is_locked === 1),
              });
            }
          } catch (fetchErr) {
            logger.warn(`Parti mesajı güncellenemedi (#${partyId}):`, fetchErr);
          }
        }
      }

      await interaction.reply({
        content: `✅ Build notunuz güncellendi: **${note}**`,
        flags: MessageFlags.Ephemeral,
      });

      return successResponse();
    } catch (err: any) {
      logger.error('Modal submit hatası:', err);
      if (!interaction.replied) {
        await interaction.reply({
          content: `❌ Hata: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return errorResponse(err.message);
    }
  }
}
