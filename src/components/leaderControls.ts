import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  UserSelectMenuBuilder,
} from 'discord.js';
import { PartyWithMembers } from '../types/party.js';

export function buildLeaderControlPanel(party: PartyWithMembers) {
  const isLocked = party.is_locked === 1;

  const embed = new EmbedBuilder()
    .setTitle(`👑 Lider Yönetim Paneli - ${party.title}`)
    .setColor(0xf1c40f)
    .setDescription(
      `Parti ID: **#${party.id}**\n` +
      `Kadro Durumu: **${party.members.length}** Üye\n` +
      `Kilit Durumu: **${isLocked ? '🔒 Kilitli' : '🔓 Açık'}**\n\n` +
      `Aşağıdaki butonları ve menüleri kullanarak partiyi yönetebilirsiniz.`
    );

  const buttonRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`party:leader_ready:${party.id}`)
      .setLabel('Hazır Kontrolü Başlat')
      .setEmoji('📢')
      .setStyle(ButtonStyle.Primary),

    new ButtonBuilder()
      .setCustomId(`party:leader_lock:${party.id}`)
      .setLabel(isLocked ? 'Kilidi Aç' : 'Partiyi Kilitle')
      .setEmoji(isLocked ? '🔓' : '🔒')
      .setStyle(isLocked ? ButtonStyle.Success : ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`party:leader_close:${party.id}`)
      .setLabel('Partiyi Kapat')
      .setEmoji('🛑')
      .setStyle(ButtonStyle.Danger)
  );

  const kickRow = new ActionRowBuilder<UserSelectMenuBuilder>().addComponents(
    new UserSelectMenuBuilder()
      .setCustomId(`party:leader_kick_select:${party.id}`)
      .setPlaceholder('Partiden atılacak (Kick) oyuncuyu seçin...')
      .setMinValues(1)
      .setMaxValues(1)
  );

  return {
    embeds: [embed],
    components: [buttonRow, kickRow],
  };
}
