# Proje Mimari Kuralları: Albion Online Party Bot
- Dil ve Runtime: Node.js, TypeScript
- Kütüphane: discord.js (v14+)
- Veri / State: SQLite (better-sqlite3) ile kalıcı veri yönetimi
- Kod Kalitesi: ESLint, Prettier, katı TypeScript tip güvenliği.
- Komut Yanıt Formatı: Tüm Discord komut ve servis yanıtları her zaman `{ success: boolean, data?: any, error?: string }` (`CommandResponse<T>`) formatında sarmalanmalıdır.
- Parti Rolleri: `Tank`, `Healer`, `DPS`, `Support` rolleri zorunlu olarak modellenmeli ve desteklenmelidir.
- Esnek Kadro Yönetimi: Farklı etkinlik türleri için esnek kadro boyutları (5 kişilik standart grup, 10 kişilik roam, 20 kişilik ZvZ / Ava Raid grupları veya özel şablonlar) ve otomatik yedek (Sub-Queue) terfi sistemi desteklenmelidir.