import { getDatabase } from '../connection.js';
import { Party, CreatePartyParams, PartyStatus } from '../../types/party.js';

export class PartyRepository {
  /**
   * Yeni parti kaydı oluşturur
   */
  static create(params: CreatePartyParams): Party {
    const db = getDatabase();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO parties (
        guild_id, channel_id, leader_id, title, description,
        template, max_tank, max_healer, max_dps, max_support,
        allowed_role_id, is_locked, status, created_at, updated_at
      ) VALUES (
        @guild_id, @channel_id, @leader_id, @title, @description,
        @template, @max_tank, @max_healer, @max_dps, @max_support,
        @allowed_role_id, 0, 'active', @created_at, @updated_at
      )
    `);

    const result = stmt.run({
      guild_id: params.guild_id,
      channel_id: params.channel_id,
      leader_id: params.leader_id,
      title: params.title,
      description: params.description || null,
      template: params.template,
      max_tank: params.max_tank ?? 1,
      max_healer: params.max_healer ?? 1,
      max_dps: params.max_dps ?? 2,
      max_support: params.max_support ?? 1,
      allowed_role_id: params.allowed_role_id || null,
      created_at: now,
      updated_at: now,
    });

    return this.findById(Number(result.lastInsertRowid))!;
  }

  /**
   * ID'ye göre parti bulur
   */
  static findById(id: number): Party | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM parties WHERE id = ?');
    const row = stmt.get(id) as Party | undefined;
    return row || null;
  }

  /**
   * Discord Mesaj ID'sine göre parti bulur
   */
  static findByMessageId(messageId: string): Party | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM parties WHERE message_id = ?');
    const row = stmt.get(messageId) as Party | undefined;
    return row || null;
  }

  /**
   * Discord Embed Mesaj ID'sini günceller
   */
  static updateMessageId(id: number, messageId: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE parties SET message_id = ?, updated_at = ? WHERE id = ?');
    const result = stmt.run(messageId, Date.now(), id);
    return result.changes > 0;
  }

  /**
   * Partinin kilit durumunu günceller (Lock/Unlock)
   */
  static setLockStatus(id: number, isLocked: boolean): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE parties SET is_locked = ?, updated_at = ? WHERE id = ?');
    const result = stmt.run(isLocked ? 1 : 0, Date.now(), id);
    return result.changes > 0;
  }

  /**
   * Partinin durumunu günceller ('active', 'completed', 'cancelled')
   */
  static updateStatus(id: number, status: PartyStatus): boolean {
    const db = getDatabase();
    const stmt = db.prepare('UPDATE parties SET status = ?, updated_at = ? WHERE id = ?');
    const result = stmt.run(status, Date.now(), id);
    return result.changes > 0;
  }

  /**
   * Partiyi siler
   */
  static delete(id: number): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM parties WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  /**
   * Sunucudaki aktif partileri getirir
   */
  static findActiveByGuild(guildId: string): Party[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM parties WHERE guild_id = ? AND status = "active" ORDER BY created_at DESC');
    return stmt.all(guildId) as Party[];
  }
}
