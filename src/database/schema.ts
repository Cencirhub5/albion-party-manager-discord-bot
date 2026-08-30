import { getDatabase } from './connection.js';
import { logger } from '../utils/logger.js';

export function initializeDatabaseSchema(): void {
  const db = getDatabase();

  logger.info('Veritabanı tabloları ve şeması kontrol ediliyor...');

  // 1. Parti tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS parties (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      channel_id TEXT NOT NULL,
      message_id TEXT,
      leader_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      template TEXT NOT NULL,
      max_tank INTEGER NOT NULL DEFAULT 1,
      max_healer INTEGER NOT NULL DEFAULT 1,
      max_dps INTEGER NOT NULL DEFAULT 2,
      max_support INTEGER NOT NULL DEFAULT 1,
      allowed_role_id TEXT,
      is_locked INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'active',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_parties_guild_status ON parties (guild_id, status);
    CREATE INDEX IF NOT EXISTS idx_parties_message_id ON parties (message_id);
  `);

  // 2. Parti Üyeleri tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS party_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      party_id INTEGER NOT NULL,
      user_id TEXT NOT NULL,
      user_tag TEXT NOT NULL,
      role TEXT NOT NULL,
      status TEXT NOT NULL,
      build_note TEXT,
      joined_at INTEGER NOT NULL,
      ready_status INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (party_id) REFERENCES parties(id) ON DELETE CASCADE,
      UNIQUE (party_id, user_id)
    );

    CREATE INDEX IF NOT EXISTS idx_party_members_party ON party_members (party_id);
    CREATE INDEX IF NOT EXISTS idx_party_members_role_status ON party_members (party_id, role, status);
  `);

  // 3. Sunucuya Özel Parti Şablonları (Templates) Tablosu
  db.exec(`
    CREATE TABLE IF NOT EXISTS party_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      guild_id TEXT NOT NULL,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      max_tank INTEGER NOT NULL,
      max_healer INTEGER NOT NULL,
      max_dps INTEGER NOT NULL,
      max_support INTEGER NOT NULL,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      UNIQUE (guild_id, name)
    );

    CREATE INDEX IF NOT EXISTS idx_party_templates_guild ON party_templates (guild_id);
  `);

  logger.info('Veritabanı şeması başarıyla hazırlandı.');
}
