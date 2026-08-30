# 🏰 Albion Online Party Manager - Discord Bot

<p align="center">
  <strong>⚔️ Advanced Party, Roster & Sub-Queue Management Bot for Albion Online Guilds</strong><br>
  <em>Albion Online Loncaları ve Oyuncuları için Gelişmiş Parti, Kadro ve Otomatik Yedek Yönetim Botu</em>
</p>
<p>
    <em>
    Invite the bot to your server
    https://discord.com/oauth2/authorize?client_id=1543647897621368982&permissions=8&integration_type=0&scope=bot+applications.commands</em>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Language-TypeScript-blue.svg" alt="TypeScript">
  <img src="https://img.shields.io/badge/discord.js-v14-5865F2.svg" alt="discord.js">
  <img src="https://img.shields.io/badge/Database-better--sqlite3-003B57.svg" alt="SQLite">
  <img src="https://img.shields.io/badge/License-MIT-green.svg" alt="License">
</p>

---

## 🌐 Diller / Languages
- [🇹🇷 Türkçe Kullanım Kılavuzu](#-türkçe-kullanım-kılavuzu)
- [🇬🇧 English Documentation](#-english-documentation)

---

# 🇹🇷 Türkçe Kullanım Kılavuzu

Albion Online oyuncularının ve loncalarının (guilds) etkinlikler, ZvZ savaşları, Avalonian Dungeon raidleri, Small Scale roamları ve statik dungeonlar için Discord üzerinden kolayca parti kurmasını, rollerini seçmesini, yedek (sub) sıralarını yönetmesini ve hazır kontrolü (Ready Check) yapmasını sağlayan yüksek performanslı Discord botudur.

### ✨ Temel Özellikler

1. **4 Temel Albion Rolü:** `Tank 🛡️`, `Healer 💚`, `DPS ⚔️`, `Support 🔮`.
2. **Canlı ve Dinamik Embed:** Oyuncular butona bastığı anda liste anında güncellenir.
3. **Akıllı Yedek Sırası & Otomatik Terfi (FIFO Sub-Queue):**
   - Kontenjanı dolan role katılmak isteyen oyuncular otomatik olarak **Yedek Kuyruğuna (SUB)** alınır.
   - Asıl kadrodan biri ayrıldığında veya çıkarıldığında, sıradaki ilk yedek **hiçbir manuel müdahaleye gerek kalmadan otomatik olarak Asıl Kadroya (MAIN)** terfi edilir.
4. **Build / Ekipman Notu:** Oyuncular `Build Notu 📝` butonuna basarak kullandıkları silahı veya IP bilgisini (örn: `1H Mace / Incubus 1700 IP`) ekleyebilir.
5. **Güvenli Lider Yönetim Paneli:**
   - Yalnızca partiyi oluşturan lidere özel açılan menü ile:
     - **📢 Hazır Kontrolü (Ready Check):** Asıl kadroyu etiketleyerek hazır kontrolü başlatır.
     - **🔒 Kilitle / Aç:** Yeni katılımları durdurur.
     - **👢 Oyuncuyu Çıkar (Kick):** Açılır menüden seçilen kişiyi partiden atar (yedek varsa otomatik asıl kadroya alır).
     - **🛑 Partiyi Kapat:** Etkinliği tamamlar.
6. **Discord Üzerinden Dinamik Şablon (Template) Yönetimi:**
   - `/template create`, `/template list` ve `/template delete` komutlarıyla sunucuya özel kadro şablonları tanımlayabilir, `/party create` sırasında Discord **Autocomplete (Otomatik Tamamlama)** ile tek tıkla kullanabilirsiniz.
7. **Duyuru & Bildirim (Ping Desteği):** Parti açıldığında otomatik `@everyone`, `@here` veya belirtilen rolü etiketler.
8. **Role-Gating (Sunucu Rolü Kısıtlaması):** Partiyi sadece belirli bir Discord rolüne (örn: `@Guild Member`) sahip üyelerin katılımına sınırlama.
9. **Kalıcı SQLite Veritabanı:** Bot yeniden başlasa bile partiler, kadrolar ve butonlar çalışmaya devam eder.

---

### 📋 Slash Komutları (Türkçe)

| Komut | Parametreler | Açıklama |
| :--- | :--- | :--- |
| `/party create` | `title`, `template`, `ping`, `description`, `role_gate`, `tanks`, `healers`, `dps`, `supports` | Yeni bir parti/etkinlik kadrosu oluşturur. |
| `/party lock` | `party_id` | Partiyi yeni katılımlara kilitler. |
| `/party unlock` | `party_id` | Partinin kilidini açar. |
| `/party readycheck` | `party_id` | Kanala Hazır Kontrolü (Ready Check) başlatır. |
| `/party kick` | `party_id`, `user` | Bir oyuncuyu partiden çıkarır (Sadece Lider). |
| `/party move` | `party_id`, `user`, `role`, `status` | Oyuncunun rolünü veya statüsünü değiştirir (Sadece Lider). |
| `/party close` | `party_id` | Partiyi sonlandırır ve butonları kapatır. |
| `/template create` | `name`, `display_name`, `tanks`, `healers`, `dps`, `supports`, `description` | Sunucuya özel yeni bir parti şablonu kaydeder. |
| `/template list` | *(Yok)* | Sunucudaki tüm hazır ve özel şablonları listeler. |
| `/template delete` | `name` | Kayıtlı bir özel şablonu siler. |

---

### 🚀 Kurulum ve Çalıştırma (Türkçe)

#### 1. Gereksinimler
- Node.js (v18.0.0 veya üzeri)
- npm veya yarn / pnpm

#### 2. Depoyu İndirin ve Bağımlılıkları Kurun
```bash
git clone https://github.com/KULLANICI_ADINIZ/albion-party-manager-discord-bot.git
cd albion-party-manager-discord-bot
npm install
```

#### 3. `.env` Dosyasını Yapılandırın
Proje ana dizininde `.env` dosyası oluşturun:
```env
DISCORD_TOKEN=bot_tokeniniz
CLIENT_ID=application_client_id_niz
GUILD_ID= (Opsiyonel: Hızlı test için sunucu ID'si)
```

#### 4. Komutları Kaydedin ve Başlatın
```bash
# TypeScript kodunu derleyin
npm run build

# Slash komutlarını Discord API'ye yükleyin
node dist/commands/register.js

# Geliştirme modu (Hot-reload)
npm run dev

# veya PM2 ile 7/24 çalıştırma (VPS)
pm2 start dist/index.js --name "albion-party-bot"
```

---

# 🇬🇧 English Documentation

An advanced and reliable Discord party management bot built for Albion Online guilds, static groups, Avalonian Dungeon raids, and ZvZ shotcallers.

### ✨ Key Features

1. **4 Mandatory Albion Roles:** `Tank 🛡️`, `Healer 💚`, `DPS ⚔️`, `Support 🔮`.
2. **Dynamic Live Embeds:** Real-time roster updates whenever a user clicks an interactive button.
3. **Smart FIFO Sub-Queue & Auto-Promotion:**
   - When a role is full, new participants automatically join the role's **Sub-Queue (SUB)**.
   - When a main roster member leaves or gets kicked, the earliest sub is **automatically promoted to the Main Roster (MAIN)** without manual intervention.
4. **Build & Item Power Notes:** Members can attach build notes (e.g. `1H Mace / Mistcaller 1700 IP`) via interactive modals.
5. **Secure Leader Control Panel:**
   - Ephemeral control panel strictly restricted to the party creator:
     - **📢 Ready Check:** Pings main roster members with interactive Yes/No buttons.
     - **🔒 Lock / Unlock:** Prevents new joins or role swaps.
     - **👢 Kick Member:** Removes an attendee and promotes the queued sub.
     - **🛑 Close Party:** Finalizes the event and disables buttons.
6. **In-Discord Dynamic Template Management:**
   - Create, list, and delete custom party templates on the fly (`/template create`, `/template list`, `/template delete`) with native **Discord Autocomplete** support in `/party create`.
7. **Automated Mentions (Ping Support):** Automatically pings `@everyone`, `@here`, or gated roles upon party creation.
8. **Role-Gating:** Restrict party signups to specific Discord guild roles (e.g. `@Guild Member`).
9. **Persistent SQLite Database:** Powered by `better-sqlite3` with WAL mode; data and button interactions persist across restarts.

---

### 📋 Slash Commands (English)

| Command | Parameters | Description |
| :--- | :--- | :--- |
| `/party create` | `title`, `template`, `ping`, `description`, `role_gate`, `tanks`, `healers`, `dps`, `supports` | Creates a new party roster embed. |
| `/party lock` | `party_id` | Locks the party from further signups/swaps. |
| `/party unlock` | `party_id` | Unlocks the party. |
| `/party readycheck` | `party_id` | Broadcasts an interactive Ready Check. |
| `/party kick` | `party_id`, `user` | Kicks a member (Leader only). |
| `/party move` | `party_id`, `user`, `role`, `status` | Moves/swaps member role or status (Leader only). |
| `/party close` | `party_id` | Completes and archives the party. |
| `/template create` | `name`, `display_name`, `tanks`, `healers`, `dps`, `supports`, `description` | Saves a custom server party preset. |
| `/template list` | *(None)* | Lists all system and custom templates. |
| `/template delete` | `name` | Deletes a custom template. |

---

### 🚀 Setup & Installation (English)

#### 1. Requirements
- Node.js (v18.0.0 or higher)
- npm / yarn / pnpm

#### 2. Clone & Install Dependencies
```bash
git clone https://github.com/YOUR_USERNAME/albion-party-manager-discord-bot.git
cd albion-party-manager-discord-bot
npm install
```

#### 3. Configure Environment Variables
Create a `.env` file in the root directory:
```env
DISCORD_TOKEN=your_bot_token
CLIENT_ID=your_client_id
GUILD_ID= (Optional: Server ID for instant guild command sync)
```

#### 4. Build & Run
```bash
# Compile TypeScript to JavaScript
npm run build

# Register slash commands
node dist/commands/register.js

# Start in development mode
npm run dev

# Or run 24/7 in production with PM2
pm2 start dist/index.js --name "albion-party-bot"
```

---

## 🛡️ License
This project is open-source and licensed under the [MIT License](LICENSE).
