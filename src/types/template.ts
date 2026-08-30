export interface PartyTemplateEntity {
  id: number;
  guild_id: string;
  name: string; // benzersiz slug örn: "ava-t8-gold"
  display_name: string; // örn: "Ava T8.3 Gold Chest"
  description: string | null;
  max_tank: number;
  max_healer: number;
  max_dps: number;
  max_support: number;
  created_by: string;
  created_at: number;
}

export interface CreateTemplateParams {
  guild_id: string;
  name: string;
  display_name: string;
  description?: string;
  max_tank: number;
  max_healer: number;
  max_dps: number;
  max_support: number;
  created_by: string;
}

export interface ResolvedTemplateInfo {
  name: string;
  displayName: string;
  description: string | null;
  tank: number;
  healer: number;
  dps: number;
  support: number;
  isCustomGuildTemplate: boolean;
}
