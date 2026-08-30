import { getDatabase } from '../database/connection.js';
import { PartyRepository } from '../database/repositories/partyRepository.js';
import { MemberRepository } from '../database/repositories/memberRepository.js';
import { PartyWithMembers, PartyMember, AlbionRole, MemberStatus } from '../types/party.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';
import { PartyService } from './partyService.js';

export interface JoinRoleResult {
  member: PartyMember;
  promotedMember?: PartyMember;
  party: PartyWithMembers;
}

export interface LeavePartyResult {
  leftMember: PartyMember;
  promotedMember?: PartyMember;
  party: PartyWithMembers;
}

export class RosterService {
  /**
   * Belirli bir role katılır. (Kadro doluysa otomatik SUB kuyruğuna eklenir)
   */
  static joinRole(
    partyId: number,
    userId: string,
    userTag: string,
    targetRole: AlbionRole,
    buildNote?: string
  ): CommandResponse<JoinRoleResult> {
    const db = getDatabase();

    const transaction = db.transaction(() => {
      const party = PartyRepository.findById(partyId);
      if (!party) {
        throw new Error(`Parti bulunamadı (ID: ${partyId})`);
      }

      if (party.status !== 'active') {
        throw new Error('Bu parti artık aktif değil.');
      }

      if (party.is_locked === 1) {
        throw new Error('Parti kilitlenmiştir, yeni katılım veya rol değişikliği yapılamaz.');
      }

      const existingMember = MemberRepository.findMember(partyId, userId);
      let oldRolePromotedMember: PartyMember | undefined;

      // 1. Kullanıcı zaten partideyse ve rol değiştiriyorsa
      if (existingMember) {
        if (existingMember.role === targetRole) {
          throw new Error(`Zaten ${targetRole} rolündesiniz (${existingMember.status === 'MAIN' ? 'Asıl Kadro' : 'Yedek'}).`);
        }

        // Eski rolden ayrılma mantığı: Eğer eski rolünde MAIN ise, o rolün ilk SUB'ını MAIN'e terfi et
        if (existingMember.status === 'MAIN') {
          const firstSub = MemberRepository.getFirstSubMember(partyId, existingMember.role);
          if (firstSub && firstSub.user_id !== userId) {
            MemberRepository.updateStatus(partyId, firstSub.user_id, 'MAIN');
            oldRolePromotedMember = MemberRepository.findMember(partyId, firstSub.user_id) || undefined;
            logger.info(`[Auto-Promote] #${partyId} ${existingMember.role} rolünde ${firstSub.user_tag} MAIN kadroya terfi edildi.`);
          }
        }
      }

      // 2. Hedef roldeki kontenjanı hesapla
      const maxSlots = this.getMaxSlotForRole(party, targetRole);
      const currentMainCount = MemberRepository.countByRoleAndStatus(partyId, targetRole, 'MAIN');

      const targetStatus: MemberStatus = currentMainCount < maxSlots ? 'MAIN' : 'SUB';

      let updatedMember: PartyMember;
      if (existingMember) {
        MemberRepository.updateRoleAndStatus(partyId, userId, targetRole, targetStatus);
        if (buildNote !== undefined) {
          MemberRepository.updateNote(partyId, userId, buildNote);
        }
        updatedMember = MemberRepository.findMember(partyId, userId)!;
      } else {
        updatedMember = MemberRepository.add(partyId, userId, userTag, targetRole, targetStatus, buildNote);
      }

      const allMembers = MemberRepository.findByPartyId(partyId);
      const partyWithMembers: PartyWithMembers = {
        ...party,
        members: allMembers,
      };

      return {
        member: updatedMember,
        promotedMember: oldRolePromotedMember,
        party: partyWithMembers,
      };
    });

    try {
      const result = transaction();
      logger.info(`[Roster] #${partyId} ${userTag} -> ${targetRole} (${result.member.status})`);
      return successResponse(result);
    } catch (err: any) {
      return errorResponse(err.message);
    }
  }

  /**
   * Partiden ayrılır. (Asıl kadrodan ayrılındıysa yedek otomatik terfi edilir)
   */
  static leaveParty(partyId: number, userId: string): CommandResponse<LeavePartyResult> {
    const db = getDatabase();

    const transaction = db.transaction(() => {
      const party = PartyRepository.findById(partyId);
      if (!party) {
        throw new Error(`Parti bulunamadı (ID: ${partyId})`);
      }

      if (party.status !== 'active') {
        throw new Error('Bu parti aktif değil.');
      }

      const member = MemberRepository.findMember(partyId, userId);
      if (!member) {
        throw new Error('Bu partide üye değilsiniz.');
      }

      let promotedMember: PartyMember | undefined;

      // Eğer asıl kadrodan ayrılıyorsa, kuyruktaki ilk yedeği asıl kadroya terfi et
      if (member.status === 'MAIN') {
        const firstSub = MemberRepository.getFirstSubMember(partyId, member.role);
        if (firstSub && firstSub.user_id !== userId) {
          MemberRepository.updateStatus(partyId, firstSub.user_id, 'MAIN');
          promotedMember = MemberRepository.findMember(partyId, firstSub.user_id) || undefined;
          logger.info(`[Auto-Promote] #${partyId} ${member.role} rolünde ${firstSub.user_tag} MAIN kadroya terfi edildi.`);
        }
      }

      // Üyeyi sil
      MemberRepository.remove(partyId, userId);

      const allMembers = MemberRepository.findByPartyId(partyId);
      const partyWithMembers: PartyWithMembers = {
        ...party,
        members: allMembers,
      };

      return {
        leftMember: member,
        promotedMember,
        party: partyWithMembers,
      };
    });

    try {
      const result = transaction();
      logger.info(`[Roster] #${partyId} Kullanıcı ayrıldı: ${result.leftMember.user_tag} (${result.leftMember.role})`);
      return successResponse(result);
    } catch (err: any) {
      return errorResponse(err.message);
    }
  }

  /**
   * Lider tarafından üyeyi partiden atma (Kick)
   */
  static kickMember(
    partyId: number,
    leaderId: string,
    targetUserId: string,
    isGuildOwner: boolean = false
  ): CommandResponse<LeavePartyResult> {
    const partyRes = PartyService.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      return errorResponse(partyRes.error || 'Parti bulunamadı.');
    }

    if (!PartyService.hasLeaderPermission(partyRes.data, leaderId, isGuildOwner)) {
      return errorResponse(`Kullanıcıyı partiden çıkarmak için sadece parti lideri (<@${partyRes.data.leader_id}>) yetkilidir.`);
    }

    return this.leaveParty(partyId, targetUserId);
  }

  /**
   * Lider tarafından üyeyi başka bir role veya statüye taşıma (Move/Promote/Demote)
   */
  static moveMember(
    partyId: number,
    leaderId: string,
    targetUserId: string,
    newRole: AlbionRole,
    newStatus?: MemberStatus,
    isGuildOwner: boolean = false
  ): CommandResponse<{ movedMember: PartyMember; oldRolePromotedMember?: PartyMember; party: PartyWithMembers }> {
    const partyRes = PartyService.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      return errorResponse(partyRes.error || 'Parti bulunamadı.');
    }

    if (!PartyService.hasLeaderPermission(partyRes.data, leaderId, isGuildOwner)) {
      return errorResponse(`Kullanıcıyı taşımak için sadece parti lideri (<@${partyRes.data.leader_id}>) yetkilidir.`);
    }

    const db = getDatabase();
    const transaction = db.transaction(() => {
      const party = PartyRepository.findById(partyId);
      if (!party) throw new Error('Parti bulunamadı.');

      const member = MemberRepository.findMember(partyId, targetUserId);
      if (!member) throw new Error('Taşınacak kullanıcı partide bulunamadı.');

      let oldRolePromotedMember: PartyMember | undefined;

      // Eski rolünde MAIN idiyse ve rolü değişiyorsa eski rolün yedeğini terfi et
      if (member.status === 'MAIN' && member.role !== newRole) {
        const firstSub = MemberRepository.getFirstSubMember(partyId, member.role);
        if (firstSub && firstSub.user_id !== targetUserId) {
          MemberRepository.updateStatus(partyId, firstSub.user_id, 'MAIN');
          oldRolePromotedMember = MemberRepository.findMember(partyId, firstSub.user_id) || undefined;
        }
      }

      // Yeni statü belirlenmediyse otomatik belirle
      let statusToSet = newStatus;
      if (!statusToSet) {
        const maxSlots = this.getMaxSlotForRole(party, newRole);
        const currentMain = MemberRepository.countByRoleAndStatus(partyId, newRole, 'MAIN');
        statusToSet = currentMain < maxSlots ? 'MAIN' : 'SUB';
      }

      MemberRepository.updateRoleAndStatus(partyId, targetUserId, newRole, statusToSet);
      const movedMember = MemberRepository.findMember(partyId, targetUserId)!;
      const allMembers = MemberRepository.findByPartyId(partyId);

      return {
        movedMember,
        oldRolePromotedMember,
        party: { ...party, members: allMembers },
      };
    });

    try {
      const result = transaction();
      return successResponse(result);
    } catch (err: any) {
      return errorResponse(err.message);
    }
  }

  /**
   * Rolün maksimum slot sayısını döndürür
   */
  private static getMaxSlotForRole(party: PartyWithMembers | any, role: AlbionRole): number {
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
}
