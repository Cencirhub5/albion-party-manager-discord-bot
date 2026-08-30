import { getDatabase } from '../connection.js';
import { PartyTemplateEntity, CreateTemplateParams } from '../../types/template.js';

export class TemplateRepository {
  /**
   * Yeni özel şablon kaydeder
   */
  static create(params: CreateTemplateParams): PartyTemplateEntity {
    const db = getDatabase();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO party_templates (
        guild_id, name, display_name, description,
        max_tank, max_healer, max_dps, max_support,
        created_by, created_at
      ) VALUES (
        @guild_id, @name, @display_name, @description,
        @max_tank, @max_healer, @max_dps, @max_support,
        @created_by, @created_at
      )
    `);

    stmt.run({
      guild_id: params.guild_id,
      name: params.name.toLowerCase().trim(),
      display_name: params.display_name.trim(),
      description: params.description || null,
      max_tank: params.max_tank,
      max_healer: params.max_healer,
      max_dps: params.max_dps,
      max_support: params.max_support,
      created_by: params.created_by,
      created_at: now,
    });

    return this.findByName(params.guild_id, params.name)!;
  }

  /**
   * Sunucuda isme (slug) göre şablon bulur
   */
  static findByName(guildId: string, name: string): PartyTemplateEntity | null {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM party_templates WHERE guild_id = ? AND name = ?');
    const row = stmt.get(guildId, name.toLowerCase().trim()) as PartyTemplateEntity | undefined;
    return row || null;
  }

  /**
   * Sunucudaki tüm özel şablonları listeler
   */
  static findByGuild(guildId: string): PartyTemplateEntity[] {
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM party_templates WHERE guild_id = ? ORDER BY created_at DESC');
    return stmt.all(guildId) as PartyTemplateEntity[];
  }

  /**
   * Şablonu siler
   */
  static delete(guildId: string, name: string): boolean {
    const db = getDatabase();
    const stmt = db.prepare('DELETE FROM party_templates WHERE guild_id = ? AND name = ?');
    const result = stmt.run(guildId, name.toLowerCase().trim());
    return result.changes > 0;
  }
}
