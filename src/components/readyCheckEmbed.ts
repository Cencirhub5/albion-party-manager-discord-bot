import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { ReadyCheckSummary } from '../services/readyCheckService.js';
import { ReadyStatus } from '../types/party.js';

export function buildReadyCheckEmbed(summary: ReadyCheckSummary): {
  embeds: EmbedBuilder[];
  components: ActionRowBuilder<ButtonBuilder>[];
} {
  const { party, totalMain, readyCount, notReadyCount, pendingCount, allReady } = summary;

  const embed = new EmbedBuilder()
    .setTitle(`📢 HAZIR KONTROLÜ (READY CHECK) - ${party.title}`)
    .setColor(allReady ? 0x2ecc71 : 0xe67e22)
    .setDescription(
      `Lider <@${party.leader_id}> hazır kontrolü başlattı!\n\n` +
      `**Durum:** ${allReady ? '✅ **HERKES HAZIR!**' : '⏳ Onaylar Bekleniyor...'}\n` +
      `• **Hazır:** \`${readyCount}/${totalMain}\` ✅\n` +
      `• **Hazır Değil:** \`${notReadyCount}\` ❌\n` +
      `• **Bekleyen:** \`${pendingCount}\` ❓`
    );

  const mainMembers = party.members.filter((m) => m.status === 'MAIN');
  let memberStatusList = '';

  for (const m of mainMembers) {
    let icon = '❓';
    if (m.ready_status === ReadyStatus.READY) icon = '✅';
    else if (m.ready_status === ReadyStatus.NOT_READY) icon = '❌';

    memberStatusList += `${icon} <@${m.user_id}> (${m.role})\n`;
  }

  embed.addFields({
    name: 'Kadro Durumu',
    value: memberStatusList || '*Kadroda üye yok*',
  });

  const row = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`party:ready_yes:${party.id}`)
      .setLabel('Hazırım')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`party:ready_no:${party.id}`)
      .setLabel('Hazır Değilim')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger)
  );

  return {
    embeds: [embed],
    components: [row],
  };
}
