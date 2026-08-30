import { initializeDatabaseSchema } from '../src/database/schema.js';
import { getDatabase, closeDatabase } from '../src/database/connection.js';
import { PartyService } from '../src/services/partyService.js';
import { RosterService } from '../src/services/rosterService.js';
import { ReadyCheckService } from '../src/services/readyCheckService.js';
import { TemplateService } from '../src/services/templateService.js';
import { MemberRepository } from '../src/database/repositories/memberRepository.js';

let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ BAŞARISIZ: ${message}`);
    failedTests++;
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ GEÇTİ: ${message}`);
    passedTests++;
  }
}

async function runTests() {
  console.log('====================================================');
  console.log('🧪 ALBION ONLINE PARTY BOT TEST PAKETİ BAŞLATILIYOR');
  console.log('====================================================\n');

  // Test Veritabanını Başlat
  initializeDatabaseSchema();

  // Test 1: Parti Oluşturma (5-man Preset)
  console.log('\n--- TEST 1: Parti Oluşturma (5-man Preset) ---');
  const createRes = PartyService.createParty({
    guild_id: 'guild_123',
    channel_id: 'chan_456',
    leader_id: 'leader_1',
    title: 'Ava Dungeon T8.3',
    description: 'Deneyimli oyuncular arıyoruz',
    template: '5-man',
  });

  assert(createRes.success === true, 'createParty success: true dönmeli');
  assert(createRes.data !== undefined, 'createParty veri nesnesi dönmeli');
  const party = createRes.data!;
  assert(party.max_tank === 1, '5-man şablonunda max_tank 1 olmalı');
  assert(party.max_healer === 1, '5-man şablonunda max_healer 1 olmalı');
  assert(party.max_dps === 2, '5-man şablonunda max_dps 2 olmalı');
  assert(party.max_support === 1, '5-man şablonunda max_support 1 olmalı');
  assert(party.is_locked === 0, 'Yeni parti kilitli olmamalı');

  // Test 2: Roster Katılımı ve Slot Doluluk Kontrolü
  console.log('\n--- TEST 2: Kadro Katılımı ve Asıl/Yedek Ayrımı ---');
  const joinTank1 = RosterService.joinRole(party.id, 'tank_user_1', 'TankUser1', 'TANK', '1H Mace');
  assert(joinTank1.success === true, 'Tank 1 başarıyla katılmalı');
  assert(joinTank1.data?.member.status === 'MAIN', 'Tank 1 MAIN kadroda olmalı');
  assert(joinTank1.data?.member.build_note === '1H Mace', 'Tank 1 build notu kaydedilmeli');

  const joinTank2 = RosterService.joinRole(party.id, 'tank_user_2', 'TankUser2', 'TANK', 'Incubus');
  assert(joinTank2.success === true, 'Tank 2 katılabilmeli');
  assert(joinTank2.data?.member.status === 'SUB', 'Tank 2 dolu olduğu için SUB (Yedek) olmalı');

  const joinTank3 = RosterService.joinRole(party.id, 'tank_user_3', 'TankUser3', 'TANK');
  assert(joinTank3.data?.member.status === 'SUB', 'Tank 3 SUB (İkinci Yedek) olmalı');

  const joinHealer = RosterService.joinRole(party.id, 'healer_user_1', 'HealerUser1', 'HEALER', 'Hallowfall');
  assert(joinHealer.data?.member.status === 'MAIN', 'Healer 1 MAIN olmalı');

  const joinDps1 = RosterService.joinRole(party.id, 'dps_user_1', 'DpsUser1', 'DPS', 'Realmbreaker');
  const joinDps2 = RosterService.joinRole(party.id, 'dps_user_2', 'DpsUser2', 'DPS', 'Shadowcaller');
  assert(joinDps1.data?.member.status === 'MAIN', 'DPS 1 MAIN olmalı');
  assert(joinDps2.data?.member.status === 'MAIN', 'DPS 2 MAIN olmalı');

  const joinDps3 = RosterService.joinRole(party.id, 'dps_user_3', 'DpsUser3', 'DPS', 'Spirithunter');
  assert(joinDps3.data?.member.status === 'SUB', 'DPS 3 SUB olmalı');

  // Test 3: Otomatik Yedek Terfisi (Auto-Promotion on Leave)
  console.log('\n--- TEST 3: Asıl Kadrodan Ayrılma ve Otomatik Yedek Terfisi ---');
  const leaveTank1 = RosterService.leaveParty(party.id, 'tank_user_1');
  assert(leaveTank1.success === true, 'Tank 1 partiden ayrılabilmeli');
  assert(leaveTank1.data?.promotedMember?.user_id === 'tank_user_2', 'Kuyruktaki ilk yedek Tank 2 terfi etmeli');
  assert(leaveTank1.data?.promotedMember?.status === 'MAIN', 'Terfi eden Tank 2 MAIN statüsünde olmalı');

  const currentTank = MemberRepository.findMember(party.id, 'tank_user_2');
  assert(currentTank?.status === 'MAIN', 'Veritabanında Tank 2 statüsü MAIN olarak güncellenmiş olmalı');

  // Test 4: Rol Değiştirme ve Zincirleme Terfi (Role Switch & Cascade)
  console.log('\n--- TEST 4: Rol Değiştirme ve Zincirleme Terfi ---');
  const switchRes = RosterService.joinRole(party.id, 'tank_user_2', 'TankUser2', 'DPS');
  assert(switchRes.success === true, 'Tank 2 DPS rolüne geçebilmeli');
  assert(switchRes.data?.promotedMember?.user_id === 'tank_user_3', 'Eski Tank rolündeki Tank 3 MAIN kadroya terfi etmeli');
  assert(switchRes.data?.member.role === 'DPS', 'Tank 2 artık DPS rolünde olmalı');
  assert(switchRes.data?.member.status === 'SUB', 'DPS dolu olduğu için Tank 2 DPS yedeği olmalı');

  // Test 5: Lider Kontrolleri & Kilit
  console.log('\n--- TEST 5: Lider Kontrolleri & Kilit ---');
  const unauthorizedLock = PartyService.setLockStatus(party.id, 'random_user', true);
  assert(unauthorizedLock.success === false, 'Yetkisiz kullanıcı partiyi kilitleyememeli');

  const leaderLock = PartyService.setLockStatus(party.id, 'leader_1', true);
  assert(leaderLock.success === true, 'Lider partiyi kilitleyebilmeli');
  assert(leaderLock.data?.is_locked === 1, 'Parti kilitli (1) olmalı');

  const lockedJoin = RosterService.joinRole(party.id, 'new_user', 'NewUser', 'SUPPORT');
  assert(lockedJoin.success === false, 'Kilitli partiye katılım engellenmeli');
  assert(lockedJoin.error?.includes('kilitlenmiştir') === true, 'Kilitli parti hata mesajı dönmeli');

  PartyService.setLockStatus(party.id, 'leader_1', false);

  // Test 6: Hazır Kontrolü (Ready Check)
  console.log('\n--- TEST 6: Hazır Kontrolü (Ready Check) ---');
  const readyStart = ReadyCheckService.startReadyCheck(party.id, 'leader_1');
  assert(readyStart.success === true, 'Hazır kontrolü başlatılabilmeli');
  assert(readyStart.data?.allReady === false, 'Başlangıçta herkes hazır olmamalı');

  ReadyCheckService.setReady(party.id, 'healer_user_1', true);
  ReadyCheckService.setReady(party.id, 'dps_user_1', true);
  ReadyCheckService.setReady(party.id, 'dps_user_2', true);
  const rFinal = ReadyCheckService.setReady(party.id, 'tank_user_3', true);
  assert(rFinal.data?.allReady === true, 'Tüm asıl kadro hazır verdiğinde allReady: true olmalı');

  // Test 7: Dinamik Şablon (Template) Yönetimi
  console.log('\n--- TEST 7: Dinamik Şablon (Template) Ekleme, Listeleme, Kullanma ve Silme ---');
  // Yeni özel şablon oluştur
  const createTplRes = TemplateService.createTemplate({
    guild_id: 'guild_123',
    name: 'ava-gold',
    display_name: 'Ava T8.3 Gold Chest',
    description: 'Altın sandık için 15 kişilik özel kadro',
    max_tank: 2,
    max_healer: 3,
    max_dps: 8,
    max_support: 2,
    created_by: 'leader_1',
  });

  assert(createTplRes.success === true, 'Özel şablon başarıyla oluşturulmalı');
  assert(createTplRes.data?.name === 'ava-gold', 'Şablon adı doğru kaydedilmeli');

  // Mükerrer isim reddedilmeli
  const dupTplRes = TemplateService.createTemplate({
    guild_id: 'guild_123',
    name: 'ava-gold',
    display_name: 'İkinci Ava',
    max_tank: 1,
    max_healer: 1,
    max_dps: 1,
    max_support: 1,
    created_by: 'leader_1',
  });
  assert(dupTplRes.success === false, 'Mükerrer şablon adı reddedilmeli');

  // Şablon listesi sorgulama
  const listTplRes = TemplateService.listTemplates('guild_123');
  assert(listTplRes.success === true, 'Şablon listesi başarıyla çekilmeli');
  assert(listTplRes.data?.custom.length === 1, 'Sunucuda 1 adet özel şablon bulunmalı');

  // Özel şablon ile parti oluşturma
  const customPartyRes = PartyService.createParty({
    guild_id: 'guild_123',
    channel_id: 'chan_456',
    leader_id: 'leader_1',
    title: 'Haftalık Ava Etkinliği',
    template: 'ava-gold' as any,
  });

  assert(customPartyRes.success === true, 'Özel şablonla parti oluşturulabilmeli');
  assert(customPartyRes.data?.max_tank === 2, 'Özel şablondaki max_tank (2) atanmalı');
  assert(customPartyRes.data?.max_healer === 3, 'Özel şablondaki max_healer (3) atanmalı');
  assert(customPartyRes.data?.max_dps === 8, 'Özel şablondaki max_dps (8) atanmalı');
  assert(customPartyRes.data?.max_support === 2, 'Özel şablondaki max_support (2) atanmalı');

  // Autocomplete arama testi
  const suggestions = TemplateService.searchTemplatesForAutocomplete('guild_123', 'ava');
  assert(suggestions.length > 0, 'Autocomplete araması eşleşen şablonları getirmeli');

  // Şablon silme
  const delTplRes = TemplateService.deleteTemplate('guild_123', 'ava-gold', 'leader_1');
  assert(delTplRes.success === true, 'Şablon başarıyla silinebilmeli');

  // Test 8: Response Standard Doğrulaması
  console.log('\n--- TEST 8: { success, data?, error? } Standart Yanıt Formatı ---');
  const errorCheck = RosterService.leaveParty(99999, 'non_existent_user');
  assert(errorCheck.success === false, 'Hatalı işlemde success: false olmalı');
  assert(typeof errorCheck.error === 'string', 'Hatalı işlemde error string dönmeli');

  console.log('\n====================================================');
  console.log(`🎉 TESTLER TAMAMLANDI: ${passedTests} Başarılı, ${failedTests} Hatalı`);
  console.log('====================================================\n');

  closeDatabase();
}

runTests().catch((e) => {
  console.error('Test çalıştırma hatası:', e);
  process.exit(1);
});
