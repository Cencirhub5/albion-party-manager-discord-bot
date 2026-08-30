import { UserSelectMenuInteraction, MessageFlags } from 'discord.js';
import { RosterService } from '../services/rosterService.js';
import { PartyService } from '../services/partyService.js';
import { buildPartyEmbed } from '../components/partyEmbed.js';
import { buildPartyButtons } from '../components/partyButtons.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export class SelectMenuHandler {
  static async handleUserSelect(interaction: UserSelectMenuInteraction): Promise<CommandResponse<void>> {
    const customId = interaction.customId;

    if (!customId.startsWith('party:leader_kick_select:')) {
      return errorResponse('Bilinmeyen seçim menüsü eylemi.');
    }

    const partyId = parseInt(customId.split(':')[2], 10);
    const targetUserId = interaction.values[0];

    if (!targetUserId) {
      await interaction.reply({ content: '❌ Hiçbir kullanıcı seçilmedi.', flags: MessageFlags.Ephemeral });
      return errorResponse('Kullanıcı seçilmedi.');
    }

    const isGuildOwner = interaction.guild?.ownerId === interaction.user.id;
    const kickRes = RosterService.kickMember(partyId, interaction.user.id, targetUserId, isGuildOwner);

    if (!kickRes.success || !kickRes.data) {
      await interaction.reply({ content: `❌ ${kickRes.error}`, flags: MessageFlags.Ephemeral });
      return errorResponse(kickRes.error || 'Kick işlemi başarısız.');
    }

    const { leftMember, promotedMember, party } = kickRes.data;

    // Mesajı güncelle
    if (party.message_id && interaction.channel) {
      try {
        const message = await interaction.channel.messages.fetch(party.message_id);
        if (message) {
          await message.edit({
            embeds: [buildPartyEmbed(party)],
            components: buildPartyButtons(party.id, party.is_locked === 1),
          });
        }
      } catch (fetchErr) {
        logger.warn(`Mesaj güncellenemedi (#${partyId}):`, fetchErr);
      }
    }

    let replyMsg = `👢 <@${targetUserId}> partiden çıkarıldı (${leftMember.role} - ${leftMember.status}).`;
    if (promotedMember) {
      replyMsg += `\n📢 Kuyruktaki yedek <@${promotedMember.user_id}> asıl kadroya terfi etti!`;
    }

    await interaction.reply({ content: replyMsg, flags: MessageFlags.Ephemeral });
    return successResponse();
  }
}
