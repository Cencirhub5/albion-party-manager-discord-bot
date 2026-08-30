import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  MessageFlags,
} from 'discord.js';
import { PartyService } from '../services/partyService.js';
import { RosterService } from '../services/rosterService.js';
import { ReadyCheckService } from '../services/readyCheckService.js';
import { TemplateService } from '../services/templateService.js';
import { buildPartyEmbed } from '../components/partyEmbed.js';
import { buildPartyButtons } from '../components/partyButtons.js';
import { buildReadyCheckEmbed } from '../components/readyCheckEmbed.js';
import { PartyTemplate, AlbionRole, MemberStatus } from '../types/party.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const partyCommand = {
  data: new SlashCommandBuilder()
    .setName('party')
    .setDescription('Albion Online parti ve kadro yönetimi')
    // Subcommand: create
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Yeni bir parti/etkinlik kadrosu oluşturur')
        .addStringOption((opt) =>
          opt
            .setName('title')
            .setDescription('Parti başlığı (örn: Ava Dungeon T8.3)')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('template')
            .setDescription('Kadro şablonu (Yerleşik veya sunucuya özel şablonlar)')
            .setRequired(true)
            .setAutocomplete(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('ping')
            .setDescription('Etkinlik duyuru etiketi (Varsayılan: @everyone)')
            .setRequired(false)
            .addChoices(
              { name: '@everyone (Tüm Sunucu)', value: 'everyone' },
              { name: '@here (Çevrim İçi Üyeler)', value: 'here' },
              { name: 'Bildirim Yok (Sessiz)', value: 'none' }
            )
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Açıklama veya ek bilgiler').setRequired(false)
        )
        .addRoleOption((opt) =>
          opt
            .setName('role_gate')
            .setDescription('Partiye katılabilecek zorunlu Discord rolü (Opsiyonel)')
            .setRequired(false)
        )
        .addIntegerOption((opt) =>
          opt.setName('tanks').setDescription('Özel Şablon: Maksimum Tank sayısı').setMinValue(0).setMaxValue(20)
        )
        .addIntegerOption((opt) =>
          opt.setName('healers').setDescription('Özel Şablon: Maksimum Healer sayısı').setMinValue(0).setMaxValue(20)
        )
        .addIntegerOption((opt) =>
          opt.setName('dps').setDescription('Özel Şablon: Maksimum DPS sayısı').setMinValue(0).setMaxValue(50)
        )
        .addIntegerOption((opt) =>
          opt.setName('supports').setDescription('Özel Şablon: Maksimum Support sayısı').setMinValue(0).setMaxValue(20)
        )
    )
    // Subcommand: lock
    .addSubcommand((sub) =>
      sub
        .setName('lock')
        .setDescription('Partiyi yeni katılımlara kilitler')
        .addIntegerOption((opt) =>
          opt.setName('party_id').setDescription('Parti ID numarası').setRequired(true)
        )
    )
    // Subcommand: unlock
    .addSubcommand((sub) =>
      sub
        .setName('unlock')
        .setDescription('Partinin kilidini açar')
        .addIntegerOption((opt) =>
          opt.setName('party_id').setDescription('Parti ID numarası').setRequired(true)
        )
    )
    // Subcommand: kick
    .addSubcommand((sub) =>
      sub
        .setName('kick')
        .setDescription('Bir oyuncuyu partiden çıkarır (Sadece Lider)')
        .addIntegerOption((opt) =>
          opt.setName('party_id').setDescription('Parti ID numarası').setRequired(true)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Çıkarılacak oyuncu').setRequired(true)
        )
    )
    // Subcommand: move
    .addSubcommand((sub) =>
      sub
        .setName('move')
        .setDescription('Bir oyuncunun rolünü veya statüsünü değiştirir (Sadece Lider)')
        .addIntegerOption((opt) =>
          opt.setName('party_id').setDescription('Parti ID numarası').setRequired(true)
        )
        .addUserOption((opt) =>
          opt.setName('user').setDescription('Taşınacak oyuncu').setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('role')
            .setDescription('Yeni rol')
            .setRequired(true)
            .addChoices(
              { name: 'Tank', value: 'TANK' },
              { name: 'Healer', value: 'HEALER' },
              { name: 'DPS', value: 'DPS' },
              { name: 'Support', value: 'SUPPORT' }
            )
        )
        .addStringOption((opt) =>
          opt
            .setName('status')
            .setDescription('Yeni kadro statüsü (Varsayılan: Otomatik)')
            .setRequired(false)
            .addChoices(
              { name: 'Asıl Kadro (MAIN)', value: 'MAIN' },
              { name: 'Yedek (SUB)', value: 'SUB' }
            )
        )
    )
    // Subcommand: readycheck
    .addSubcommand((sub) =>
      sub
        .setName('readycheck')
        .setDescription('Parti üyeleri için hazır kontrolü başlatır (Sadece Lider)')
        .addIntegerOption((opt) =>
          opt.setName('party_id').setDescription('Parti ID numarası').setRequired(true)
        )
    )
    // Subcommand: close
    .addSubcommand((sub) =>
      sub
        .setName('close')
        .setDescription('Partiyi sonlandırır ve kapatır (Sadece Lider)')
        .addIntegerOption((opt) =>
          opt.setName('party_id').setDescription('Parti ID numarası').setRequired(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<CommandResponse<any>> {
    const subCommand = interaction.options.getSubcommand();
    const isGuildOwner = interaction.guild?.ownerId === interaction.user.id;

    try {
      if (subCommand === 'create') {
        return await handleCreate(interaction);
      } else if (subCommand === 'lock' || subCommand === 'unlock') {
        return await handleLockToggle(interaction, subCommand === 'lock', isGuildOwner);
      } else if (subCommand === 'kick') {
        return await handleKick(interaction, isGuildOwner);
      } else if (subCommand === 'move') {
        return await handleMove(interaction, isGuildOwner);
      } else if (subCommand === 'readycheck') {
        return await handleReadyCheck(interaction, isGuildOwner);
      } else if (subCommand === 'close') {
        return await handleClose(interaction, isGuildOwner);
      }

      return errorResponse(`Bilinmeyen alt komut: ${subCommand}`);
    } catch (err: any) {
      logger.error(`Komut hatası (/party ${subCommand}):`, err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({ content: `❌ Bir hata oluştu: ${err.message}`, flags: MessageFlags.Ephemeral });
      }
      return errorResponse(err.message);
    }
  },

  async autocomplete(interaction: AutocompleteInteraction): Promise<void> {
    const focusedValue = interaction.options.getFocused();
    const guildId = interaction.guildId;
    if (!guildId) return;

    const suggestions = TemplateService.searchTemplatesForAutocomplete(guildId, focusedValue);
    await interaction.respond(suggestions);
  },
};

async function handleCreate(interaction: ChatInputCommandInteraction): Promise<CommandResponse<any>> {
  const title = interaction.options.getString('title', true);
  const template = interaction.options.getString('template', true) as PartyTemplate;
  const description = interaction.options.getString('description') || undefined;
  const roleGate = interaction.options.getRole('role_gate');
  const pingChoice = interaction.options.getString('ping') || 'everyone';

  const maxTank = interaction.options.getInteger('tanks') || undefined;
  const maxHealer = interaction.options.getInteger('healers') || undefined;
  const maxDps = interaction.options.getInteger('dps') || undefined;
  const maxSupport = interaction.options.getInteger('supports') || undefined;

  const res = PartyService.createParty({
    guild_id: interaction.guildId!,
    channel_id: interaction.channelId,
    leader_id: interaction.user.id,
    title,
    description,
    template,
    allowed_role_id: roleGate?.id,
    max_tank: maxTank,
    max_healer: maxHealer,
    max_dps: maxDps,
    max_support: maxSupport,
  });

  if (!res.success || !res.data) {
    await interaction.reply({ content: `❌ ${res.error}`, flags: MessageFlags.Ephemeral });
    return res;
  }

  const party = res.data;
  const embed = buildPartyEmbed(party);
  const buttons = buildPartyButtons(party.id, false);

  // Etiket Bildirimi (Ping) Belirleme
  let contentText = '';
  if (roleGate) {
    contentText = `<@&${roleGate.id}> ⚔️ **Yeni Parti Kuruldu!**`;
  } else if (pingChoice === 'everyone') {
    contentText = `@everyone ⚔️ **Yeni Parti Kuruldu!**`;
  } else if (pingChoice === 'here') {
    contentText = `@here ⚔️ **Yeni Parti Kuruldu!**`;
  }

  await interaction.reply({
    content: contentText || undefined,
    embeds: [embed],
    components: buttons,
    allowedMentions: {
      parse: ['everyone', 'roles', 'users'],
    },
  });

  const message = await interaction.fetchReply();

  // Mesaj ID'sini kaydet
  PartyService.setMessageId(party.id, message.id);
  party.message_id = message.id;

  return successResponse(party);
}

async function handleLockToggle(
  interaction: ChatInputCommandInteraction,
  isLock: boolean,
  isGuildOwner: boolean
): Promise<CommandResponse<any>> {
  const partyId = interaction.options.getInteger('party_id', true);
  const res = PartyService.setLockStatus(partyId, interaction.user.id, isLock, isGuildOwner);

  if (!res.success || !res.data) {
    await interaction.reply({ content: `❌ ${res.error}`, flags: MessageFlags.Ephemeral });
    return res;
  }

  const party = res.data;
  if (party.message_id && interaction.channel) {
    try {
      const message = await interaction.channel.messages.fetch(party.message_id);
      if (message) {
        await message.edit({
          embeds: [buildPartyEmbed(party)],
          components: buildPartyButtons(party.id, isLock),
        });
      }
    } catch (e) {
      logger.warn(`Mesaj güncellenemedi: ${e}`);
    }
  }

  await interaction.reply({
    content: isLock ? `🔒 Parti #${partyId} kilitlendi.` : `🔓 Parti #${partyId} kilidi açıldı.`,
    flags: MessageFlags.Ephemeral,
  });

  return res;
}

async function handleKick(
  interaction: ChatInputCommandInteraction,
  isGuildOwner: boolean
): Promise<CommandResponse<any>> {
  const partyId = interaction.options.getInteger('party_id', true);
  const targetUser = interaction.options.getUser('user', true);

  const kickRes = RosterService.kickMember(partyId, interaction.user.id, targetUser.id, isGuildOwner);
  if (!kickRes.success || !kickRes.data) {
    await interaction.reply({ content: `❌ ${kickRes.error}`, flags: MessageFlags.Ephemeral });
    return kickRes;
  }

  const { leftMember, promotedMember, party } = kickRes.data;
  if (party.message_id && interaction.channel) {
    try {
      const message = await interaction.channel.messages.fetch(party.message_id);
      if (message) {
        await message.edit({
          embeds: [buildPartyEmbed(party)],
          components: buildPartyButtons(party.id, party.is_locked === 1),
        });
      }
    } catch (e) {
      logger.warn(`Mesaj güncellenemedi: ${e}`);
    }
  }

  let replyText = `👢 <@${targetUser.id}> partiden çıkarıldı (${leftMember.role} - ${leftMember.status}).`;
  if (promotedMember) {
    replyText += `\n📢 Yedeği <@${promotedMember.user_id}> asıl kadroya terfi etti!`;
  }

  await interaction.reply({ content: replyText, flags: MessageFlags.Ephemeral });
  return kickRes;
}

async function handleMove(
  interaction: ChatInputCommandInteraction,
  isGuildOwner: boolean
): Promise<CommandResponse<any>> {
  const partyId = interaction.options.getInteger('party_id', true);
  const targetUser = interaction.options.getUser('user', true);
  const newRole = interaction.options.getString('role', true) as AlbionRole;
  const newStatus = interaction.options.getString('status') as MemberStatus | null;

  const moveRes = RosterService.moveMember(
    partyId,
    interaction.user.id,
    targetUser.id,
    newRole,
    newStatus || undefined,
    isGuildOwner
  );

  if (!moveRes.success || !moveRes.data) {
    await interaction.reply({ content: `❌ ${moveRes.error}`, flags: MessageFlags.Ephemeral });
    return moveRes;
  }

  const { movedMember, oldRolePromotedMember, party } = moveRes.data;
  if (party.message_id && interaction.channel) {
    try {
      const message = await interaction.channel.messages.fetch(party.message_id);
      if (message) {
        await message.edit({
          embeds: [buildPartyEmbed(party)],
          components: buildPartyButtons(party.id, party.is_locked === 1),
        });
      }
    } catch (e) {
      logger.warn(`Mesaj güncellenemedi: ${e}`);
    }
  }

  let replyText = `🔄 <@${targetUser.id}> yeni role taşındı: **${movedMember.role}** (${movedMember.status}).`;
  if (oldRolePromotedMember) {
    replyText += `\n📢 Eski rolündeki yedek <@${oldRolePromotedMember.user_id}> asıl kadroya terfi etti!`;
  }

  await interaction.reply({ content: replyText, flags: MessageFlags.Ephemeral });
  return moveRes;
}

async function handleReadyCheck(
  interaction: ChatInputCommandInteraction,
  isGuildOwner: boolean
): Promise<CommandResponse<any>> {
  const partyId = interaction.options.getInteger('party_id', true);
  const readyRes = ReadyCheckService.startReadyCheck(partyId, interaction.user.id, isGuildOwner);

  if (!readyRes.success || !readyRes.data) {
    await interaction.reply({ content: `❌ ${readyRes.error}`, flags: MessageFlags.Ephemeral });
    return readyRes;
  }

  const readyEmbedData = buildReadyCheckEmbed(readyRes.data);
  const mainMembers = readyRes.data.party.members.filter((m) => m.status === 'MAIN');
  const mentions = mainMembers.map((m) => `<@${m.user_id}>`).join(' ');

  if (interaction.channel && 'send' in interaction.channel) {
    await interaction.channel.send({
      content: `📢 **Hazır Kontrolü Başlatıldı!** ${mentions}`,
      embeds: readyEmbedData.embeds,
      components: readyEmbedData.components,
    });
  }

  await interaction.reply({ content: '✅ Hazır kontrolü kanala gönderildi.', flags: MessageFlags.Ephemeral });
  return readyRes;
}

async function handleClose(
  interaction: ChatInputCommandInteraction,
  isGuildOwner: boolean
): Promise<CommandResponse<any>> {
  const partyId = interaction.options.getInteger('party_id', true);
  const closeRes = PartyService.closeParty(partyId, interaction.user.id, isGuildOwner);

  if (!closeRes.success || !closeRes.data) {
    await interaction.reply({ content: `❌ ${closeRes.error}`, flags: MessageFlags.Ephemeral });
    return closeRes;
  }

  const partyRes = PartyService.getParty(partyId);
  if (partyRes.success && partyRes.data && partyRes.data.message_id && interaction.channel) {
    try {
      const message = await interaction.channel.messages.fetch(partyRes.data.message_id);
      if (message) {
        await message.edit({
          embeds: [buildPartyEmbed(partyRes.data)],
          components: [], // Butonları kaldır
        });
      }
    } catch (e) {
      logger.warn(`Mesaj güncellenemedi: ${e}`);
    }
  }

  await interaction.reply({ content: `🛑 Parti #${partyId} başarıyla kapatıldı.`, flags: MessageFlags.Ephemeral });
  return closeRes;
}
