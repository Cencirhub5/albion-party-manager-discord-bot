export type AlbionRole = 'TANK' | 'HEALER' | 'DPS' | 'SUPPORT';

export type MemberStatus = 'MAIN' | 'SUB';

export type PartyStatus = 'active' | 'completed' | 'cancelled';

export type PartyTemplate = '5-man' | '10-man' | '20-man' | 'custom';

export enum ReadyStatus {
  PENDING = 0,
  READY = 1,
  NOT_READY = 2,
}

export interface Party {
  id: number;
  guild_id: string;
  channel_id: string;
  message_id: string | null;
  leader_id: string;
  title: string;
  description: string | null;
  template: PartyTemplate;
  max_tank: number;
  max_healer: number;
  max_dps: number;
  max_support: number;
  allowed_role_id: string | null;
  is_locked: number; // 0 = false, 1 = true
  status: PartyStatus;
  created_at: number;
  updated_at: number;
}

export interface PartyMember {
  id: number;
  party_id: number;
  user_id: string;
  user_tag: string;
  role: AlbionRole;
  status: MemberStatus;
  build_note: string | null;
  joined_at: number;
  ready_status: ReadyStatus;
}

export interface PartyWithMembers extends Party {
  members: PartyMember[];
}

export interface CreatePartyParams {
  guild_id: string;
  channel_id: string;
  leader_id: string;
  title: string;
  description?: string;
  template: PartyTemplate;
  max_tank?: number;
  max_healer?: number;
  max_dps?: number;
  max_support?: number;
  allowed_role_id?: string;
}

export interface PartyPresetConfig {
  name: PartyTemplate;
  displayName: string;
  description: string;
  tank: number;
  healer: number;
  dps: number;
  support: number;
}

export const PARTY_PRESETS: Record<Exclude<PartyTemplate, 'custom'>, PartyPresetConfig> = {
  '5-man': {
    name: '5-man',
    displayName: '5 Kişilik Standart Grup',
    description: 'Dungeon & Roaming (1 Tank, 1 Healer, 2 DPS, 1 Support)',
    tank: 1,
    healer: 1,
    dps: 2,
    support: 1,
  },
  '10-man': {
    name: '10-man',
    displayName: '10 Kişilik Small Scale Grup',
    description: 'Small Scale PvP & Outpost (2 Tank, 2 Healer, 4 DPS, 2 Support)',
    tank: 2,
    healer: 2,
    dps: 4,
    support: 2,
  },
  '20-man': {
    name: '20-man',
    displayName: '20 Kişilik ZvZ / Ava Raid',
    description: 'Avalonian Dungeon & ZvZ Roster (3 Tank, 4 Healer, 10 DPS, 3 Support)',
    tank: 3,
    healer: 4,
    dps: 10,
    support: 3,
  },
};
