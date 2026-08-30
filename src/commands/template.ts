import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AutocompleteInteraction,
  PermissionsBitField,
  EmbedBuilder,
  MessageFlags,
} from 'discord.js';
import { TemplateService } from '../services/templateService.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export const templateCommand = {
  data: new SlashCommandBuilder()
    .setName('template')
    .setDescription('Özel parti şablonu (Preset) oluşturma ve yönetme')
    // Subcommand: create
    .addSubcommand((sub) =>
      sub
        .setName('create')
        .setDescription('Sunucuya özel yeni bir parti kadro şablonu kaydeder')
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('Şablon kısa adı/kodu (örn: ava-gold, gank-squad)')
            .setRequired(true)
        )
        .addStringOption((opt) =>
          opt
            .setName('display_name')
            .setDescription('Görünecek başlık (örn: Ava T8.3 Gold Chest)')
            .setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('tanks').setDescription('Tank kontenjanı').setMinValue(0).setMaxValue(20).setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('healers').setDescription('Healer kontenjanı').setMinValue(0).setMaxValue(20).setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('dps').setDescription('DPS kontenjanı').setMinValue(0).setMaxValue(50).setRequired(true)
        )
        .addIntegerOption((opt) =>
          opt.setName('supports').setDescription('Support kontenjanı').setMinValue(0).setMaxValue(20).setRequired(true)
        )
        .addStringOption((opt) =>
          opt.setName('description').setDescription('Şablon açıklaması').setRequired(false)
        )
    )
    // Subcommand: list
    .addSubcommand((sub) =>
      sub
        .setName('list')
        .setDescription('Sunucudaki yerleşik ve kayıtlı özel tüm şablonları listeler')
    )
    // Subcommand: delete
    .addSubcommand((sub) =>
      sub
        .setName('delete')
        .setDescription('Kayıtlı bir özel şablonu siler')
        .addStringOption((opt) =>
          opt
            .setName('name')
            .setDescription('Silinecek şablon adı')
            .setRequired(true)
            .setAutocomplete(true)
        )
    ),

  async execute(interaction: ChatInputCommandInteraction): Promise<CommandResponse<any>> {
    const subCommand = interaction.options.getSubcommand();
    const isGuildAdmin = interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator) || false;

    try {
      if (subCommand === 'create') {
        return await handleCreate(interaction);
      } else if (subCommand === 'list') {
        return await handleList(interaction);
      } else if (subCommand === 'delete') {
        return await handleDelete(interaction, isGuildAdmin);
      }

      return errorResponse(`Bilinmeyen alt komut: ${subCommand}`);
    } catch (err: any) {
      logger.error(`Template komut hatası (${subCommand}):`, err);
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
  const guildId = interaction.guildId!;
  const name = interaction.options.getString('name', true);
  const displayName = interaction.options.getString('display_name', true);
  const tanks = interaction.options.getInteger('tanks', true);
  const healers = interaction.options.getInteger('healers', true);
  const dps = interaction.options.getInteger('dps', true);
  const supports = interaction.options.getInteger('supports', true);
  const description = interaction.options.getString('description') || undefined;

  const res = TemplateService.createTemplate({
    guild_id: guildId,
    name,
    display_name: displayName,
    description,
    max_tank: tanks,
    max_healer: healers,
    max_dps: dps,
    max_support: supports,
    created_by: interaction.user.id,
  });

  if (!res.success || !res.data) {
    await interaction.reply({ content: `❌ ${res.error}`, flags: MessageFlags.Ephemeral });
    return res;
  }

  const created = res.data;
  const total = created.max_tank + created.max_healer + created.max_dps + created.max_support;

  const embed = new EmbedBuilder()
    .setTitle(`✅ Yeni Şablon Kaydedildi: ${created.display_name}`)
    .setColor(0x2ecc71)
    .setDescription(
      `**Kod:** \`${created.name}\`\n` +
      (created.description ? `**Açıklama:** ${created.description}\n` : '') +
      `**Toplam Kapasite:** \`${total}\` Kişi\n\n` +
      `**Rol Dağılımı:**\n` +
      `• 🛡️ **Tank:** \`${created.max_tank}\`\n` +
      `• 💚 **Healer:** \`${created.max_healer}\`\n` +
      `• ⚔️ **DPS:** \`${created.max_dps}\`\n` +
      `• 🔮 **Support:** \`${created.max_support}\`\n\n` +
      `Artık \`/party create template:${created.name}\` komutu ile bu şablonu kullanabilirsiniz!`
    )
    .setFooter({ text: `Oluşturan: ${interaction.user.tag}` })
    .setTimestamp();

  await interaction.reply({ embeds: [embed] });
  return successResponse(created);
}

async function handleList(interaction: ChatInputCommandInteraction): Promise<CommandResponse<any>> {
  const guildId = interaction.guildId!;
  const res = TemplateService.listTemplates(guildId);

  if (!res.success || !res.data) {
    await interaction.reply({ content: `❌ ${res.error}`, flags: MessageFlags.Ephemeral });
    return res;
  }

  const { builtin, custom } = res.data;

  const embed = new EmbedBuilder()
    .setTitle('📋 Parti Kadro Şablonları')
    .setColor(0x3498db)
    .setDescription('Aşağıda bu sunucuda kullanabileceğiniz tüm hazır ve özel şablonlar listelenmiştir.');

  // 1. Yerleşik Sistem Şablonları
  let builtinText = '';
  for (const b of builtin) {
    const total = b.tank + b.healer + b.dps + b.support;
    builtinText += `🔹 **${b.displayName}** (\`${b.name}\`) - **${total} Kişi**\n` +
      `↳ 🛡️ ${b.tank}T | 💚 ${b.healer}H | ⚔️ ${b.dps}DPS | 🔮 ${b.support}Supp\n`;
  }
  embed.addFields({ name: '🌐 Yerleşik Sistem Şablonları', value: builtinText || 'Yok', inline: false });

  // 2. Sunucuya Özel Şablonlar
  let customText = '';
  if (custom.length === 0) {
    customText = '*Henüz sunucuya özel bir şablon kaydedilmemiş.*\n`/template create` komutu ile yeni şablon oluşturabilirsiniz.';
  } else {
    for (const c of custom) {
      const total = c.max_tank + c.max_healer + c.max_dps + c.max_support;
      customText += `⭐ **${c.display_name}** (\`${c.name}\`) - **${total} Kişi**\n` +
        `↳ 🛡️ ${c.max_tank}T | 💚 ${c.max_healer}H | ⚔️ ${c.max_dps}DPS | 🔮 ${c.max_support}Supp\n` +
        (c.description ? `↳ *${c.description}*\n` : '');
    }
  }
  embed.addFields({ name: `🏛️ Sunucuya Özel Şablonlar (${custom.length})`, value: customText, inline: false });

  await interaction.reply({ embeds: [embed] });
  return successResponse(res.data);
}

async function handleDelete(
  interaction: ChatInputCommandInteraction,
  isGuildAdmin: boolean
): Promise<CommandResponse<any>> {
  const guildId = interaction.guildId!;
  const name = interaction.options.getString('name', true);

  const res = TemplateService.deleteTemplate(guildId, name, interaction.user.id, isGuildAdmin);
  if (!res.success) {
    await interaction.reply({ content: `❌ ${res.error}`, flags: MessageFlags.Ephemeral });
    return res;
  }

  await interaction.reply({
    content: `🗑️ **"${name}"** adlı özel şablon başarıyla silindi.`,
  });

  return res;
}
