import { ButtonInteraction, GuildMember, MessageFlags } from 'discord.js';
import { RosterService } from '../services/rosterService.js';
import { PartyService } from '../services/partyService.js';
import { ReadyCheckService } from '../services/readyCheckService.js';
import { MemberRepository } from '../database/repositories/memberRepository.js';
import { buildPartyEmbed } from '../components/partyEmbed.js';
import { buildPartyButtons } from '../components/partyButtons.js';
import { buildLeaderControlPanel } from '../components/leaderControls.js';
import { buildReadyCheckEmbed } from '../components/readyCheckEmbed.js';
import { ModalHandler } from './modalHandler.js';
import { AlbionRole } from '../types/party.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export class ButtonHandler {
  static async handleButton(interaction: ButtonInteraction): Promise<CommandResponse<void>> {
    const customId = interaction.customId;
    const parts = customId.split(':');
    const actionPrefix = parts[0]; // 'party'
    const actionType = parts[1]; // 'role', 'leave', 'note', 'leader', 'ready_yes', 'ready_no', etc.

    if (actionPrefix !== 'party') {
      return errorResponse('Bilinmeyen buton formatı.');
    }

    try {
      // 1. Rol Butonları (party:role:<ROLE>:<partyId>)
      if (actionType === 'role') {
        const role = parts[2] as AlbionRole;
        const partyId = parseInt(parts[3], 10);
        return await this.handleRoleJoin(interaction, partyId, role);
      }

      // 2. Partiden Ayrıl Butonu (party:leave:<partyId>)
      if (actionType === 'leave') {
        const partyId = parseInt(parts[2], 10);
        return await this.handleLeave(interaction, partyId);
      }

      // 3. Build Notu Ekle (party:note:<partyId>)
      if (actionType === 'note') {
        const partyId = parseInt(parts[2], 10);
        const member = MemberRepository.findMember(partyId, interaction.user.id);
        const modal = ModalHandler.createBuildNoteModal(partyId, member?.build_note);
        await interaction.showModal(modal);
        return successResponse();
      }

      // 4. Lider Paneli Aç (party:leader:<partyId>)
      if (actionType === 'leader') {
        const partyId = parseInt(parts[2], 10);
        return await this.handleOpenLeaderPanel(interaction, partyId);
      }

      // 5. Lider Hazır Kontrolü Başlat (party:leader_ready:<partyId>)
      if (actionType === 'leader_ready') {
        const partyId = parseInt(parts[2], 10);
        return await this.handleStartReadyCheck(interaction, partyId);
      }

      // 6. Lider Kilit Aç / Kapa (party:leader_lock:<partyId>)
      if (actionType === 'leader_lock') {
        const partyId = parseInt(parts[2], 10);
        return await this.handleToggleLock(interaction, partyId);
      }

      // 7. Lider Partiyi Kapat (party:leader_close:<partyId>)
      if (actionType === 'leader_close') {
        const partyId = parseInt(parts[2], 10);
        return await this.handleCloseParty(interaction, partyId);
      }

      // 8. Hazır Kontrolü - Hazırım (party:ready_yes:<partyId>)
      if (actionType === 'ready_yes') {
        const partyId = parseInt(parts[2], 10);
        return await this.handleReadyResponse(interaction, partyId, true);
      }

      // 9. Hazır Kontrolü - Hazır Değilim (party:ready_no:<partyId>)
      if (actionType === 'ready_no') {
        const partyId = parseInt(parts[2], 10);
        return await this.handleReadyResponse(interaction, partyId, false);
      }

      return errorResponse(`Bilinmeyen buton eylemi: ${actionType}`);
    } catch (err: any) {
      logger.error(`Buton işleme hatası (${customId}):`, err);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ Bir hata oluştu: ${err.message}`,
          flags: MessageFlags.Ephemeral,
        });
      }
      return errorResponse(err.message);
    }
  }

  /**
   * Rol katılımını yönetir
   */
  private static async handleRoleJoin(
    interaction: ButtonInteraction,
    partyId: number,
    role: AlbionRole
  ): Promise<CommandResponse<void>> {
    const partyRes = PartyService.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      await interaction.reply({ content: `❌ ${partyRes.error}`, flags: MessageFlags.Ephemeral });
      return errorResponse(partyRes.error || 'Parti bulunamadı.');
    }

    const party = partyRes.data;

    // Role-gating kontrolü
    if (party.allowed_role_id && interaction.member) {
      const member = interaction.member as GuildMember;
      if (!member.roles.cache.has(party.allowed_role_id)) {
        await interaction.reply({
          content: `❌ Bu partiye katılmak için <@&${party.allowed_role_id}> rolüne sahip olmalısınız.`,
          flags: MessageFlags.Ephemeral,
        });
        return errorResponse('Role-gate yetkisiz erişim.');
      }
    }

    const userTag = interaction.user.displayName || interaction.user.username;
    const joinRes = RosterService.joinRole(partyId, interaction.user.id, userTag, role);

    if (!joinRes.success || !joinRes.data) {
      await interaction.reply({ content: `⚠️ ${joinRes.error}`, flags: MessageFlags.Ephemeral });
      return errorResponse(joinRes.error || 'Role katılınamadı.');
    }

    const { member, promotedMember, party: updatedParty } = joinRes.data;

    // Ana embed mesajını güncelle
    await this.updatePartyMessage(interaction, updatedParty);

    let replyMsg = member.status === 'MAIN'
      ? `✅ **${role}** rolünde asıl kadroya katıldınız!`
      : `⏳ **${role}** kadrosu dolu olduğu için **Yedek Kuyruğuna** (#${updatedParty.members.filter(m => m.role === role && m.status === 'SUB').length}) eklendiniz.`;

    if (promotedMember) {
      replyMsg += `\n📢 Eski rolünüzdeki yedek <@${promotedMember.user_id}> asıl kadroya terfi etti!`;
    }

    await interaction.reply({ content: replyMsg, flags: MessageFlags.Ephemeral });
    return successResponse();
  }

  /**
   * Partiden ayrılmayı yönetir
   */
  private static async handleLeave(interaction: ButtonInteraction, partyId: number): Promise<CommandResponse<void>> {
    const leaveRes = RosterService.leaveParty(partyId, interaction.user.id);

    if (!leaveRes.success || !leaveRes.data) {
      await interaction.reply({ content: `⚠️ ${leaveRes.error}`, flags: MessageFlags.Ephemeral });
      return errorResponse(leaveRes.error || 'Ayrılma başarısız.');
    }

    const { leftMember, promotedMember, party: updatedParty } = leaveRes.data;

    await this.updatePartyMessage(interaction, updatedParty);

    let replyMsg = `🚪 Partiden ayrıldınız (${leftMember.role} - ${leftMember.status}).`;
    if (promotedMember) {
      replyMsg += `\n📢 Yedeğiniz <@${promotedMember.user_id}> otomatik olarak asıl kadroya yükseltildi!`;
    }

    await interaction.reply({ content: replyMsg, flags: MessageFlags.Ephemeral });
    return successResponse();
  }

  /**
   * Lider panelini açar (Sadece Partiyi Oluşturan Lider)
   */
  private static async handleOpenLeaderPanel(
    interaction: ButtonInteraction,
    partyId: number
  ): Promise<CommandResponse<void>> {
    const partyRes = PartyService.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      await interaction.reply({ content: '❌ Parti bulunamadı.', flags: MessageFlags.Ephemeral });
      return errorResponse('Parti bulunamadı.');
    }

    const party = partyRes.data;
    const isGuildOwner = interaction.guild?.ownerId === interaction.user.id;

    if (!PartyService.hasLeaderPermission(party, interaction.user.id, isGuildOwner)) {
      await interaction.reply({
        content: `❌ Lider paneline sadece bu partiyi oluşturan lider (<@${party.leader_id}>) erişebilir.`,
        flags: MessageFlags.Ephemeral,
      });
      return errorResponse('Yetkisiz erişim.');
    }

    const panel = buildLeaderControlPanel(party);
    await interaction.reply({
      embeds: panel.embeds,
      components: panel.components,
      flags: MessageFlags.Ephemeral,
    });

    return successResponse();
  }

  /**
   * Lider tarafından hazır kontrolü başlatır
   */
  private static async handleStartReadyCheck(
    interaction: ButtonInteraction,
    partyId: number
  ): Promise<CommandResponse<void>> {
    const isGuildOwner = interaction.guild?.ownerId === interaction.user.id;
    const readyRes = ReadyCheckService.startReadyCheck(partyId, interaction.user.id, isGuildOwner);

    if (!readyRes.success || !readyRes.data) {
      await interaction.reply({ content: `❌ ${readyRes.error}`, flags: MessageFlags.Ephemeral });
      return errorResponse(readyRes.error || 'Hazır kontrolü başlatılamadı.');
    }

    const readyEmbedData = buildReadyCheckEmbed(readyRes.data);

    // Kanala genel mesaj olarak hazır kontrolü gönderilir
    if (interaction.channel && 'send' in interaction.channel) {
      const mainMembers = readyRes.data.party.members.filter((m) => m.status === 'MAIN');
      const mentions = mainMembers.map((m) => `<@${m.user_id}>`).join(' ');

      await interaction.channel.send({
        content: `📢 **Hazır Kontrolü Başlatıldı!** ${mentions}`,
        embeds: readyEmbedData.embeds,
        components: readyEmbedData.components,
      });
    }

    await interaction.reply({ content: '✅ Hazır kontrolü kanala gönderildi.', flags: MessageFlags.Ephemeral });
    return successResponse();
  }

  /**
   * Kilit durumunu değiştirir (Sadece Lider)
   */
  private static async handleToggleLock(
    interaction: ButtonInteraction,
    partyId: number
  ): Promise<CommandResponse<void>> {
    const isGuildOwner = interaction.guild?.ownerId === interaction.user.id;
    const partyRes = PartyService.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      await interaction.reply({ content: '❌ Parti bulunamadı.', flags: MessageFlags.Ephemeral });
      return errorResponse('Parti bulunamadı.');
    }

    const party = partyRes.data;
    const newLockStatus = party.is_locked !== 1;

    const updateRes = PartyService.setLockStatus(partyId, interaction.user.id, newLockStatus, isGuildOwner);
    if (!updateRes.success || !updateRes.data) {
      await interaction.reply({ content: `❌ ${updateRes.error}`, flags: MessageFlags.Ephemeral });
      return errorResponse(updateRes.error || 'Kilit durumu değiştirilemedi.');
    }

    await this.updatePartyMessage(interaction, updateRes.data);

    await interaction.reply({
      content: newLockStatus ? '🔒 Parti yeni katılımlara kilitlendi.' : '🔓 Parti kilidi açıldı.',
      flags: MessageFlags.Ephemeral,
    });
    return successResponse();
  }

  /**
   * Partiyi sonlandırır (Sadece Lider)
   */
  private static async handleCloseParty(
    interaction: ButtonInteraction,
    partyId: number
  ): Promise<CommandResponse<void>> {
    const isGuildOwner = interaction.guild?.ownerId === interaction.user.id;
    const closeRes = PartyService.closeParty(partyId, interaction.user.id, isGuildOwner);

    if (!closeRes.success || !closeRes.data) {
      await interaction.reply({ content: `❌ ${closeRes.error}`, flags: MessageFlags.Ephemeral });
      return errorResponse(closeRes.error || 'Parti kapatılamadı.');
    }

    const partyRes = PartyService.getParty(partyId);
    if (partyRes.success && partyRes.data) {
      await this.updatePartyMessage(interaction, partyRes.data, true);
    }

    await interaction.reply({ content: '🛑 Parti başarıyla sonlandırıldı ve kapatıldı.', flags: MessageFlags.Ephemeral });
    return successResponse();
  }

  /**
   * Hazır kontrolü yanıtlarını işler
   */
  private static async handleReadyResponse(
    interaction: ButtonInteraction,
    partyId: number,
    isReady: boolean
  ): Promise<CommandResponse<void>> {
    const readyRes = ReadyCheckService.setReady(partyId, interaction.user.id, isReady);

    if (!readyRes.success || !readyRes.data) {
      await interaction.reply({ content: `⚠️ ${readyRes.error}`, flags: MessageFlags.Ephemeral });
      return errorResponse(readyRes.error || 'Hazır durumu güncellenemedi.');
    }

    const readyEmbedData = buildReadyCheckEmbed(readyRes.data);
    await interaction.update({
      embeds: readyEmbedData.embeds,
      components: readyEmbedData.components,
    });

    return successResponse();
  }

  /**
   * Ana parti mesajını günceller
   */
  private static async updatePartyMessage(
    interaction: ButtonInteraction,
    party: any,
    isClosed: boolean = false
  ): Promise<void> {
    const embeds = [buildPartyEmbed(party)];
    const components = isClosed ? [] : buildPartyButtons(party.id, party.is_locked === 1);

    // 1. Doğrudan butonun bulunduğu mesajı düzenle
    if (interaction.message) {
      try {
        await interaction.message.edit({ embeds, components });
        return;
      } catch (msgErr) {
        logger.warn(`interaction.message.edit hatası (#${party.id}):`, msgErr);
      }
    }

    // 2. Yedek: Mesajı kanaldan ID ile çekerek düzenle
    if (!party.message_id || !interaction.channel) return;
    try {
      const message = await interaction.channel.messages.fetch(party.message_id);
      if (message) {
        await message.edit({ embeds, components });
      }
    } catch (err) {
      logger.warn(`Mesaj ID ile yenilenirken hata oluştu (#${party.id}):`, err);
    }
  }
}
