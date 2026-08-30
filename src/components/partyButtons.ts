import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

export function buildPartyButtons(partyId: number, isLocked: boolean = false): ActionRowBuilder<ButtonBuilder>[] {
  const row1 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`party:role:TANK:${partyId}`)
      .setLabel('Tank')
      .setEmoji('🛡️')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(isLocked),

    new ButtonBuilder()
      .setCustomId(`party:role:HEALER:${partyId}`)
      .setLabel('Healer')
      .setEmoji('💚')
      .setStyle(ButtonStyle.Success)
      .setDisabled(isLocked),

    new ButtonBuilder()
      .setCustomId(`party:role:DPS:${partyId}`)
      .setLabel('DPS')
      .setEmoji('⚔️')
      .setStyle(ButtonStyle.Danger)
      .setDisabled(isLocked),

    new ButtonBuilder()
      .setCustomId(`party:role:SUPPORT:${partyId}`)
      .setLabel('Support')
      .setEmoji('🔮')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(isLocked)
  );

  const row2 = new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId(`party:note:${partyId}`)
      .setLabel('Build Notu')
      .setEmoji('📝')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`party:leave:${partyId}`)
      .setLabel('Ayrıl')
      .setEmoji('🚪')
      .setStyle(ButtonStyle.Secondary),

    new ButtonBuilder()
      .setCustomId(`party:leader:${partyId}`)
      .setLabel('Lider Paneli')
      .setEmoji('👑')
      .setStyle(ButtonStyle.Secondary)
  );

  return [row1, row2];
}
