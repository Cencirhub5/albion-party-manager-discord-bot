import { MemberRepository } from '../database/repositories/memberRepository.js';
import { PartyService } from './partyService.js';
import { PartyWithMembers, ReadyStatus } from '../types/party.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';

export interface ReadyCheckSummary {
  party: PartyWithMembers;
  totalMain: number;
  readyCount: number;
  notReadyCount: number;
  pendingCount: number;
  allReady: boolean;
}

export class ReadyCheckService {
  /**
   * Hazır kontrolü başlatır (Tüm durumları sıfırlar - Sadece Lider)
   */
  static startReadyCheck(
    partyId: number,
    leaderId: string,
    isGuildOwner: boolean = false
  ): CommandResponse<ReadyCheckSummary> {
    const partyRes = PartyService.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      return errorResponse(partyRes.error || 'Parti bulunamadı.');
    }

    const party = partyRes.data;
    if (!PartyService.hasLeaderPermission(party, leaderId, isGuildOwner)) {
      return errorResponse(`Hazır kontrolü başlatmak için sadece parti lideri (<@${party.leader_id}>) yetkilidir.`);
    }

    MemberRepository.resetAllReadyStatus(partyId);
    return this.getSummary(partyId);
  }

  /**
   * Oyuncunun hazır durumunu günceller
   */
  static setReady(partyId: number, userId: string, isReady: boolean): CommandResponse<ReadyCheckSummary> {
    const member = MemberRepository.findMember(partyId, userId);
    if (!member) {
      return errorResponse('Bu partide üye değilsiniz.');
    }

    const status = isReady ? ReadyStatus.READY : ReadyStatus.NOT_READY;
    MemberRepository.updateReadyStatus(partyId, userId, status);
    return this.getSummary(partyId);
  }

  /**
   * Hazır kontrolü özetini hesaplar
   */
  static getSummary(partyId: number): CommandResponse<ReadyCheckSummary> {
    const partyRes = PartyService.getParty(partyId);
    if (!partyRes.success || !partyRes.data) {
      return errorResponse(partyRes.error || 'Parti bulunamadı.');
    }

    const party = partyRes.data;
    const mainMembers = party.members.filter((m) => m.status === 'MAIN');

    let readyCount = 0;
    let notReadyCount = 0;
    let pendingCount = 0;

    for (const m of mainMembers) {
      if (m.ready_status === ReadyStatus.READY) readyCount++;
      else if (m.ready_status === ReadyStatus.NOT_READY) notReadyCount++;
      else pendingCount++;
    }

    const allReady = mainMembers.length > 0 && readyCount === mainMembers.length;

    return successResponse({
      party,
      totalMain: mainMembers.length,
      readyCount,
      notReadyCount,
      pendingCount,
      allReady,
    });
  }
}
