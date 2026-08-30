import { TemplateRepository } from '../database/repositories/templateRepository.js';
import { PARTY_PRESETS, PartyTemplate, PartyPresetConfig } from '../types/party.js';
import {
  PartyTemplateEntity,
  CreateTemplateParams,
  ResolvedTemplateInfo,
} from '../types/template.js';
import { CommandResponse } from '../types/response.js';
import { successResponse, errorResponse } from '../utils/response.js';
import { logger } from '../utils/logger.js';

const BUILTIN_NAMES = ['5-man', '10-man', '20-man', 'custom'];

export class TemplateService {
  /**
   * Yeni özel şablon kaydeder
   */
  static createTemplate(params: CreateTemplateParams): CommandResponse<PartyTemplateEntity> {
    const slugName = params.name.toLowerCase().trim();

    // 1. İsim doğrulaması
    if (!/^[a-z0-9-_]+$/.test(slugName)) {
      return errorResponse('Şablon adı sadece küçük harf, rakam, tire (-) ve alt çizgi (_) içerebilir.');
    }

    if (BUILTIN_NAMES.includes(slugName)) {
      return errorResponse(`"${slugName}" ismi sistem şablonu olduğu için özel şablon adı olarak kullanılamaz.`);
    }

    const totalSlots = params.max_tank + params.max_healer + params.max_dps + params.max_support;
    if (totalSlots < 1) {
      return errorResponse('Şablonda toplam en az 1 kişilik kontenjan bulunmalıdır.');
    }

    // 2. Mükerrer isim kontrolü
    const existing = TemplateRepository.findByName(params.guild_id, slugName);
    if (existing) {
      return errorResponse(`"${slugName}" adında bir şablon sunucuda zaten mevcut.`);
    }

    try {
      const created = TemplateRepository.create({
        ...params,
        name: slugName,
      });

      logger.info(`[Template] Yeni şablon oluşturuldu: "${created.name}" (${created.display_name}) - Guild: ${params.guild_id}`);
      return successResponse(created);
    } catch (err: any) {
      logger.error('Şablon kaydedilirken hata:', err);
      return errorResponse(`Şablon kaydedilemedi: ${err.message}`);
    }
  }

  /**
   * Sunucudaki yerleşik ve özel tüm şablonları listeler
   */
  static listTemplates(guildId: string): CommandResponse<{
    builtin: PartyPresetConfig[];
    custom: PartyTemplateEntity[];
  }> {
    try {
      const builtin = Object.values(PARTY_PRESETS);
      const custom = TemplateRepository.findByGuild(guildId);

      return successResponse({
        builtin,
        custom,
      });
    } catch (err: any) {
      return errorResponse(`Şablonlar listelenirken hata: ${err.message}`);
    }
  }

  /**
   * Şablonu siler
   */
  static deleteTemplate(
    guildId: string,
    name: string,
    userId: string,
    isGuildAdmin: boolean = false
  ): CommandResponse<void> {
    const slugName = name.toLowerCase().trim();

    if (BUILTIN_NAMES.includes(slugName)) {
      return errorResponse('Sistem varsayılan şablonları silinemez.');
    }

    const existing = TemplateRepository.findByName(guildId, slugName);
    if (!existing) {
      return errorResponse(`"${slugName}" adında bir şablon bulunamadı.`);
    }

    if (existing.created_by !== userId && !isGuildAdmin) {
      return errorResponse('Bu şablonu sadece oluşturan kişi veya sunucu yöneticisi silebilir.');
    }

    try {
      TemplateRepository.delete(guildId, slugName);
      logger.info(`[Template] Şablon silindi: "${slugName}" - Guild: ${guildId}`);
      return successResponse();
    } catch (err: any) {
      return errorResponse(`Şablon silinirken hata: ${err.message}`);
    }
  }

  /**
   * Şablon adını çözümler (Yerleşik veya Özel)
   */
  static resolveTemplate(guildId: string, templateKey: string): ResolvedTemplateInfo | null {
    const key = templateKey.toLowerCase().trim();

    // 1. Yerleşik (Built-in) şablon kontrolü
    if (PARTY_PRESETS[key as Exclude<PartyTemplate, 'custom'>]) {
      const preset = PARTY_PRESETS[key as Exclude<PartyTemplate, 'custom'>];
      return {
        name: preset.name,
        displayName: preset.displayName,
        description: preset.description,
        tank: preset.tank,
        healer: preset.healer,
        dps: preset.dps,
        support: preset.support,
        isCustomGuildTemplate: false,
      };
    }

    // 2. Sunucuya özel şablon kontrolü
    const custom = TemplateRepository.findByName(guildId, key);
    if (custom) {
      return {
        name: custom.name,
        displayName: custom.display_name,
        description: custom.description,
        tank: custom.max_tank,
        healer: custom.max_healer,
        dps: custom.max_dps,
        support: custom.max_support,
        isCustomGuildTemplate: true,
      };
    }

    return null;
  }

  /**
   * Autocomplete için şablon arama önerilerini döndürür
   */
  static searchTemplatesForAutocomplete(
    guildId: string,
    query: string
  ): Array<{ name: string; value: string }> {
    const q = query.toLowerCase().trim();
    const results: Array<{ name: string; value: string }> = [];

    // Yerleşikler
    const builtinList = [
      { name: '5 Kişilik Standart Grup (1T, 1H, 2DPS, 1Supp)', value: '5-man' },
      { name: '10 Kişilik Roam / Small Scale (2T, 2H, 4DPS, 2Supp)', value: '10-man' },
      { name: '20 Kişilik ZvZ / Ava Raid (3T, 4H, 10DPS, 3Supp)', value: '20-man' },
      { name: 'Özel (Custom) Yapılandırma (Serbest Mod)', value: 'custom' },
    ];

    for (const b of builtinList) {
      if (!q || b.name.toLowerCase().includes(q) || b.value.toLowerCase().includes(q)) {
        results.push(b);
      }
    }

    // Sunucuya özel şablonlar
    const customList = TemplateRepository.findByGuild(guildId);
    for (const c of customList) {
      const label = `⭐ ${c.display_name} (${c.max_tank}T, ${c.max_healer}H, ${c.max_dps}DPS, ${c.max_support}Supp)`;
      if (!q || label.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)) {
        results.push({
          name: label.length > 100 ? label.slice(0, 97) + '...' : label,
          value: c.name,
        });
      }
    }

    return results.slice(0, 25); // Discord 25 öneri limiti
  }
}
