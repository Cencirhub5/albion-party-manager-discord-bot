import { EmbedBuilder } from 'discord.js';
import { PartyWithMembers, AlbionRole, PartyMember } from '../types/party.js';

const ROLE_ICONS: Record<AlbionRole, string> = {
  TANK: '🛡️',
  HEALER: '💚',
  DPS: '⚔️',
  SUPPORT: '🔮',
};

const ROLE_NAMES: Record<AlbionRole, string> = {
  TANK: 'Tank',
  HEALER: 'Healer',
  DPS: 'DPS',
  SUPPORT: 'Support',
};

export function buildPartyEmbed(party: PartyWithMembers): EmbedBuilder {
  const isLocked = party.is_locked === 1;
  const statusColor = party.status === 'completed' ? 0x95a5a6 : isLocked ? 0xe67e22 : 0x2ecc71;

  const totalMainCount = party.members.filter((m) => m.status === 'MAIN').length;
  const totalMax = party.max_tank + party.max_healer + party.max_dps + party.max_support;
  const totalSubCount = party.members.filter((m) => m.status === 'SUB').length;

  const embed = new EmbedBuilder()
    .setTitle(`🏰 ${party.title}`)
    .setColor(statusColor)
    .setTimestamp(party.created_at);

  let descriptionText = '';
  if (party.description) {
    descriptionText += `${party.description}\n\n`;
  }

  descriptionText += `**Lider:** <@${party.leader_id}>\n`;
  descriptionText += `**Şablon:** \`${party.template}\` | **Durum:** ${isLocked ? '🔒 Kilitli' : '🔓 Açık'}\n`;
  descriptionText += `**Kadro:** \`${totalMainCount}/${totalMax}\` (Yedek: \`${totalSubCount}\`)\n`;

  if (party.allowed_role_id) {
    descriptionText += `**Gereken Sunucu Rolü:** <@&${party.allowed_role_id}>\n`;
  }

  embed.setDescription(descriptionText);

  // Rol Listeleri
  const roles: AlbionRole[] = ['TANK', 'HEALER', 'DPS', 'SUPPORT'];

  for (const role of roles) {
    const maxForRole = getMaxSlotForRole(party, role);
    const mainMembers = party.members.filter((m) => m.role === role && m.status === 'MAIN');
    const subMembers = party.members.filter((m) => m.role === role && m.status === 'SUB');

    let fieldContent = '';

    // Asıl Kadro Slotları
    for (let i = 0; i < maxForRole; i++) {
      const member = mainMembers[i];
      if (member) {
        const note = member.build_note ? ` *(${member.build_note})*` : '';
        fieldContent += `**${i + 1}.** <@${member.user_id}>${note}\n`;
      } else {
        fieldContent += `**${i + 1}.** *[Boş Slot]*\n`;
      }
    }

    // Yedek (Sub) Kuyruğu
    if (subMembers.length > 0) {
      fieldContent += `\n**⏳ Yedek Kuyruğu (${subMembers.length}):**\n`;
      subMembers.forEach((sub, idx) => {
        const note = sub.build_note ? ` *(${sub.build_note})*` : '';
        fieldContent += `↳ \`#${idx + 1}\` <@${sub.user_id}>${note}\n`;
      });
    }

    embed.addFields({
      name: `${ROLE_ICONS[role]} ${ROLE_NAMES[role]} (${mainMembers.length}/${maxForRole})`,
      value: fieldContent.trim() || '*Slot Yok*',
      inline: false,
    });
  }

  embed.setFooter({
    text: `Albion Party Bot • Parti ID: ${party.id}`,
  });

  return embed;
}

function getMaxSlotForRole(party: PartyWithMembers, role: AlbionRole): number {
  switch (role) {
    case 'TANK':
      return party.max_tank;
    case 'HEALER':
      return party.max_healer;
    case 'DPS':
      return party.max_dps;
    case 'SUPPORT':
      return party.max_support;
  }
}
