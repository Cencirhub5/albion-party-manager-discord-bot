import { PartyRepository } from '../database/repositories/partyRepository.js';
import { MemberRepository } from '../database/repositories/memberRepository.js';
import { TemplateService } from './templateService.js';
import {
  Party,
  PartyWithMembers,
  CreatePartyParams,
} from '../types/party.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

export class PartyService {
  /**
   * Yeni parti oluşturur (Yerleşik veya Sunucuya Özel Şablon destekli)
   */
  static createParty(params: CreatePartyParams): CommandResponse<PartyWithMembers> {
    try {
      let maxTank = params.max_tank;
      let maxHealer = params.max_healer;
      let maxDps = params.max_dps;
      let maxSupport = params.max_support;

      // 1. Şablon çözümlemesi yap (Yerleşik veya Özel Şablon)
      if (params.template !== 'custom') {
        const resolved = TemplateService.resolveTemplate(params.guild_id, params.template);
        if (resolved) {
          maxTank = maxTank ?? resolved.tank;
          maxHealer = maxHealer ?? resolved.healer;
          maxDps = maxDps ?? resolved.dps;
          maxSupport = maxSupport ?? resolved.support;
        } else {
          maxTank = maxTank ?? 1;
          maxHealer = maxHealer ?? 1;
          maxDps = maxDps ?? 2;
          maxSupport = maxSupport ?? 1;
        }
      } else {
        maxTank = maxTank ?? 1;
        maxHealer = maxHealer ?? 1;
        maxDps = maxDps ?? 2;
        maxSupport = maxSupport ?? 1;
      }

      const party = PartyRepository.create({
        ...params,
        max_tank: maxTank,
        max_healer: maxHealer,
        max_dps: maxDps,
        max_support: maxSupport,
      });

      const partyWithMembers: PartyWithMembers = {
        ...party,
        members: [],
      };

      logger.info(`Yeni parti oluşturuldu: #${party.id} "${party.title}" (${party.template}) - Lider: ${party.leader_id}`);
      return successResponse(partyWithMembers);
    } catch (err: any) {
      logger.error('Parti oluşturulurken hata meydana geldi:', err);
      return errorResponse(`Parti oluşturulamadı: ${err.message}`);
    }
  }

  /**
   * Parti ve üyelerini getirir
   */
  static getParty(partyId: number): CommandResponse<PartyWithMembers> {
    try {
      const party = PartyRepository.findById(partyId);
      if (!party) {
        return errorResponse(`Parti bulunamadı (ID: ${partyId})`);
      }

      const members = MemberRepository.findByPartyId(partyId);
      return successResponse({
        ...party,
        members,
      });
    } catch (err: any) {
      logger.error(`Parti getirilirken hata (#${partyId}):`, err);
      return errorResponse(`Parti bilgisi alınamadı: ${err.message}`);
    }
  }

  /**
   * Mesaj ID'sine göre partiyi getirir
   */
  static getPartyByMessageId(messageId: string): CommandResponse<PartyWithMembers> {
    try {
      const party = PartyRepository.findByMessageId(messageId);
      if (!party) {
        return errorResponse(`Mesaj ID'sine ait parti bulunamadı (${messageId})`);
      }

      const members = MemberRepository.findByPartyId(party.id);
      return successResponse({
        ...party,
        members,
      });
    } catch (err: any) {
      logger.error(`Mesaj ID ile parti getirilirken hata (${messageId}):`, err);
      return errorResponse(`Parti bilgisi alınamadı: ${err.message}`);
    }
  }

  /**
   * Mesaj ID'sini bağlar
   */
  static setMessageId(partyId: number, messageId: string): CommandResponse<void> {
    try {
      const updated = PartyRepository.updateMessageId(partyId, messageId);
      if (!updated) {
        return errorResponse(`Parti mesaj ID güncellenemedi (#${partyId})`);
      }
      return successResponse();
    } catch (err: any) {
      return errorResponse(`Hata: ${err.message}`);
    }
  }

  /**
   * Partiyi kilitler veya kilidini açar (Sadece Partiyi Oluşturan Lider)
   */
  static setLockStatus(
    partyId: number,
    userId: string,
    isLocked: boolean,
    isGuildOwner: boolean = false
  ): CommandResponse<PartyWithMembers> {
    const partyRes = this.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      return partyRes;
    }

    const party = partyRes.data;
    if (!this.hasLeaderPermission(party, userId, isGuildOwner)) {
      return errorResponse(`Bu işlem için sadece partiyi oluşturan lider (<@${party.leader_id}>) yetkilidir.`);
    }

    PartyRepository.setLockStatus(partyId, isLocked);
    return this.getParty(partyId);
  }

  /**
   * Partiyi sonlandırır / kapatır
   */
  static closeParty(
    partyId: number,
    userId: string,
    isGuildOwner: boolean = false
  ): CommandResponse<{ partyId: number }> {
    const partyRes = this.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      return errorResponse(partyRes.error || 'Parti bulunamadı');
    }

    const party = partyRes.data;
    if (!this.hasLeaderPermission(party, userId, isGuildOwner)) {
      return errorResponse(`Partiyi yalnızca oluşturan lider (<@${party.leader_id}>) kapatabilir.`);
    }

    PartyRepository.updateStatus(partyId, 'completed');
    logger.info(`Parti #${partyId} sonlandırıldı.`);
    return successResponse({ partyId });
  }

  /**
   * Lider yetkisini doğrular (Sadece partiyi oluşturan lider veya sunucu sahibi)
   */
  static hasLeaderPermission(party: Party, userId: string, isGuildOwner: boolean = false): boolean {
    return party.leader_id === userId || isGuildOwner;
  }
}
