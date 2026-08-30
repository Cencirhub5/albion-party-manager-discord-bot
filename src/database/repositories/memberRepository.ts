import { getDatabase } from '../connection.js';
import { PartyMember, AlbionRole, MemberStatus, ReadyStatus } from '../../types/party.js';

export class MemberRepository {
  /**
   * Partideki tüm üyeleri sıralı getirir (MAIN olanlar önce, ardından SUB olanlar)
   */
  static findByPartyId(partyId: number): PartyMember[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM party_members 
      WHERE party_id = ? 
      ORDER BY 
        CASE status WHEN 'MAIN' THEN 1 WHEN 'SUB' THEN 2 ELSE 3 END,
        joined_at ASC
    `);
    return stmt.all(partyId) as PartyMember[];
  }

  /**
   * Belirli bir partideki belirli bir kullanıcıyı bulur
   */
  static findMember(partyId: number, userId: string): PartyMember | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM party_members WHERE party_id = ? AND user_id = ?');
    const row = stmt.get(partyId, userId) as PartyMember | undefined;
    return row || null;
  }

  /**
   * Belirli bir rol ve statüdeki (MAIN/SUB) üyeleri getirir
   */
  static findByRoleAndStatus(partyId: number, role: AlbionRole, status: MemberStatus): PartyMember[] {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM party_members 
      WHERE party_id = ? AND role = ? AND status = ? 
      ORDER BY joined_at ASC
    `);
    return stmt.all(partyId, role, status) as PartyMember[];
  }

  /**
   * Belirli bir rol ve statüdeki üye sayısını getirir
   */
  static countByRoleAndStatus(partyId: number, role: AlbionRole, status: MemberStatus): number {
    const db = getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM party_members WHERE party_id = ? AND role = ? AND status = ?');
    const row = stmt.get(partyId, role, status) as { count: number };
    return row.count;
  }

  /**
   * Partiye yeni üye ekler (MAIN veya SUB)
   */
  static add(
    partyId: number,
    userId: string,
    userTag: string,
    role: AlbionRole,
    status: MemberStatus,
    buildNote?: string | null
  ): PartyMember {
    const db = getDatabase();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO party_members (
        party_id, user_id, user_tag, role, status, build_note, joined_at, ready_status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, 0)
    `);

    stmt.run(partyId, userId, userTag, role, status, buildNote || null, now);
    return this.findMember(partyId, userId)!;
  }

  /**
   * Partiden üyeyi siler
   */
  static remove(partyId: number, userId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM party_members WHERE party_id = ? AND user_id = ?');
    const result = stmt.run(partyId, userId);
    return result.changes > 0;
  }

  /**
   * Üyenin rolünü ve statüsünü günceller
   */
  static updateRoleAndStatus(partyId: number, userId: string, role: AlbionRole, status: MemberStatus): boolean {
    const db = getDatabase();
    const stmt = db.prepare(`
      UPDATE party_members 
      SET role = ?, status = ?, joined_at = ? 
      WHERE party_id = ? AND user_id = ?
    `);
    const result = stmt.run(role, status, Date.now(), partyId, userId);
    return result.changes > 0;
  }

  /**
   * Üyenin statüsünü günceller (örn. SUB -> MAIN terfisi)
   */
  static updateStatus(partyId: number, userId: string, status: MemberStatus): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE party_members SET status = ? WHERE party_id = ? AND user_id = ?');
    const result = stmt.run(status, partyId, userId);
    return result.changes > 0;
  }

  /**
   * Üyenin notunu / build açıklamasını günceller
   */
  static updateNote(partyId: number, userId: string, note: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE party_members SET build_note = ? WHERE party_id = ? AND user_id = ?');
    const result = stmt.run(note, partyId, userId);
    return result.changes > 0;
  }

  /**
   * Hazır durumunu günceller
   */
  static updateReadyStatus(partyId: number, userId: string, readyStatus: ReadyStatus): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE party_members SET ready_status = ? WHERE party_id = ? AND user_id = ?');
    const result = stmt.run(readyStatus, partyId, userId);
    return result.changes > 0;
  }

  /**
   * Partideki tüm üyelerin hazır durumunu sıfırlar
   */
  static resetAllReadyStatus(partyId: number): void {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE party_members SET ready_status = 0 WHERE party_id = ?');
    stmt.run(partyId);
  }

  /**
   * Belirli bir rol için kuyruktaki ilk yedeği (FIFO) getirir
   */
  static getFirstSubMember(partyId: number, role: AlbionRole): PartyMember | null {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM party_members 
      WHERE party_id = ? AND role = ? AND status = 'SUB' 
      ORDER BY joined_at ASC 
      LIMIT 1
    `);
    const row = stmt.get(partyId, role) as PartyMember | undefined;
    return row || null;
  }
}
