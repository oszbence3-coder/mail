# 📁 Projekt Struktúra (v2.0)

```
imap-email-client/
│
├── 📄 server.js                       # Fő alkalmazás szerver (Express + IMAP/SMTP + Security)
├── 📄 server.js.backup                # Backup fájl
├── 📄 package.json                    # NPM függőségek és scriptek
├── 📄 .env.example                    # Környezeti változók minta
├── 📄 .gitignore                      # Git kizárási lista
│
├── 📄 README.md                       # Projekt dokumentáció
├── 📄 CHANGELOG.md                    # Verzió történet és változások
├── 📄 CHECKLIST.md                    # Fejlesztési checklist
├── 📄 UPDATES.md                      # Update notes
├── 📄 PROJECT_STRUCTURE.md            # Ez a fájl
├── 📄 RENDER_DEPLOY.md                # Render.com telepítési útmutató
├── 📄 SECURITY.md                     # Biztonsági dokumentáció
├── 📄 SECURITY_IMPLEMENTATION.md      # Biztonsági implementáció részletei
│
├── 📁 views/                          # EJS template fájlok
│   ├── login.ejs                      # Bejelentkezési oldal (particles + orbs)
│   ├── loading.ejs                    # Animált loading screen
│   ├── logout.ejs                     # Animált logout screen
│   ├── inbox.ejs                      # Inbox (email lista + sidebar + snippets)
│   ├── message.ejs                    # Egyetlen email (HTML dark/light mode + attachments)
│   └── compose.ejs                    # Új email írása (rich editor + attachments)
│
├── 📁 public/                         # Statikus fájlok (CSS, JS, képek)
│   └── 📁 css/
│       └── style.css                  # Fő stíluslap (modern, responsive)
│
└── 📁 assets/                         # Projekt assets
    └── logo.png                       # Magyar Osu Mapek logo
```

## 🔧 Kulcs fájlok leírása

### `server.js`
A fő backend logika:
- Express szerver beállítása
- Session kezelés
- IMAP kapcsolat (email olvasás)
- SMTP kapcsolat (email küldés)
- Route-ok: `/login`, `/inbox`, `/message/:uid`, `/compose`, `/send`
- Helper függvények:
  - `connectIMAP()` - IMAP kapcsolat
  - `fetchEmails()` - Email lista lekérése
  - `fetchSingleEmail()` - Egyetlen email lekérése
  - `sendEmail()` - Email küldés SMTP-n keresztül

### `package.json`
Függőségek:
- **express** - Web framework
- **ejs** - Template engine
- **imap** - IMAP protokoll kliens
- **nodemailer** - SMTP email küldés
- **mailparser** - Email parsing
- **express-session** - Session kezelés
- **connect-flash** - Flash üzenetek
- **dotenv** - Környezeti változók
- **multer** - Fájl upload kezelés (50MB max)
- **express-rate-limit** - Rate limiting (DDoS/brute force védelem)
- **helmet** - Security headers (CSP, HSTS, XSS védelem)
- **cookie-parser** - Cookie parsing
- **express-validator** - Input validation
- **sanitize-html** - HTML sanitization (XSS védelem)
- **mammoth** - DOCX fájl kezelés
- **pdf-parse** - PDF parsing (kommentezve kompatibilitási problémák miatt)

### Views (EJS Templates)

#### `login.ejs`
- Email + jelszó form
- Gmail App Password útmutató
- Floating particles és orbs animációk
- 5 színséma választó
- Flash error/success messages

#### `loading.ejs`
- Animált loading screen bejelentkezés után
- 3 lépéses progress bar
- Particles és orbs háttér
- Auto redirect inbox-ra

#### `logout.ejs`
- Animált logout screen
- Spinner animáció
- Auto redirect login-ra 2mp után
- Particles és orbs háttér

#### `inbox.ejs`
- Email lista táblázat formában
- Sidebar navigáció (Inbox, Sent, Spam, Trash)
- Message snippets (első 80 karakter)
- Pagination
- Particles és orbs háttér
- Realtime polling (30mp)
- Keresés funkció

#### `message.ejs`
- Email teljes tartalma
- Dark/Light mode toggle HTML emailekhez
- Metaadatok (Feladó, Címzett, CC, Dátum)
- HTML email biztonságos iframe renderelés
- Attachment preview:
  - Képek: inline preview, kattintható nagyítás
  - Videók: beépített video player
  - Hangok: beépített audio player
  - PDF: iframe preview
  - Office (Word/Excel/PowerPoint): szép kártyás megjelenítés
- Action buttons: Reply, Forward, Spam, Delete
- Particles és orbs háttér

#### `compose.ejs`
- Új email írás vagy Reply/Forward
- Rich text editor toolbar (bold, italic, underline, stb.)
- To, CC, BCC, Subject, Body mezők
- Attachment upload (max 50MB, multi-file)
- File type icons és méret megjelenítés
- Támogatott formátumok: képek, videók, hangok, PDF, Office, archívumok
- Particles és orbs háttér

### `public/css/style.css`
Modern, professzionális dizájn:
- CSS változók (color scheme)
- Responsive design (mobile-first)
- Modern card-based layout
- Hover effects
- Flash message styling
- Email table formatting

## 🌐 Route-ok

| Route | Method | Leírás |
|-------|--------|--------|
| `/` | GET | Redirect `/inbox`-ra vagy `/login`-ra |
| `/login` | GET | Bejelentkezési oldal |
| `/login` | POST | Bejelentkezés feldolgozása |
| `/logout` | GET | Kijelentkezés |
| `/inbox` | GET | Email lista (INBOX) |
| `/message/:uid` | GET | Egyetlen email megjelenítése |
| `/compose` | GET | Új email írása form |
| `/send` | POST | Email küldés |

## 🔐 Biztonság

### Session
- `express-session` middleware
- Session cookie (httpOnly)
- Credentials session-ben tárolva (DEV only!)

### Éles környezet
- ⚠️ OAuth2 implementálása ajánlott
- ⚠️ Session store (Redis) használata
- ⚠️ HTTPS kötelező (Render.com automatikusan ad)
- ⚠️ Rate limiting
- ⚠️ CSRF protection

## 📊 Működési Flow

### Bejelentkezés
1. User kitölti email + password mezőket
2. Server IMAP kapcsolatot próbál létrehozni
3. Sikeres → Session létrehozása, redirect `/inbox`
4. Sikertelen → Flash error, marad `/login`

### Email olvasás
1. User `/inbox`-ot nyit
2. Server lekéri az INBOX összes üzenetét (headers only)
3. Lista megjelenítése táblázatban
4. User rákattint egy email-re
5. Server lekéri a teljes email tartalmat (body)
6. Megjelenítés `/message/:uid` oldalon

### Email küldés
1. User `/compose` form kitöltése
2. POST `/send`
3. Server SMTP-n keresztül elküldi
4. Flash success message
5. Redirect `/inbox`

## 🚀 Performance

### IMAP optimalizálás
- Csak header fetch az inbox listázáshoz
- Teljes body csak kattintáskor
- Connection pooling (nincs implementálva, de lehetséges)

### Render.com
- Free tier: Cold start ~30s inaktivitás után
- Starter tier: Always on, instant response

## 🔄 Jövőbeli fejlesztések

- [ ] OAuth2 Google authentikáció
- [ ] Email keresés (search filter)
- [ ] Mappák kezelése (Sent, Drafts, Spam, stb.)
- [ ] Email törlése
- [ ] Email jelölése olvasottként
- [ ] Attachment támogatás
- [ ] Rich text editor (HTML email)
- [ ] Multi-account support
- [ ] Email címzettek autocomplete
- [ ] Dark mode
- [ ] Internationalization (i18n)

## 📦 Build & Deploy

### Local Development
```powershell
npm install
npm start
# vagy fejlesztéshez:
npm run dev  # nodemon auto-restart
```

### Production (Render.com)
```bash
# Render automatikusan futtatja:
npm install
npm start
```

## 🐛 Debug

### Logs megtekintése
**Render.com:**
Dashboard → Logs tab

**Lokálisan:**
```powershell
npm start
# Console output látható
```

### Common Issues
- **IMAP timeout**: Rossz credentials vagy Gmail App Password nincs beállítva
- **SMTP error**: Ugyanaz, vagy port blokkolva
- **Session lost**: SESSION_SECRET nincs beállítva
- **Port error**: Render automatikusan állítja a PORT-ot, ne override-old

## 📚 Dokumentáció linkek

- [Node IMAP docs](https://github.com/mscdex/node-imap)
- [Nodemailer docs](https://nodemailer.com/)
- [Express docs](https://expressjs.com/)
- [Gmail App Passwords](https://support.google.com/accounts/answer/185833)
- [Render.com docs](https://render.com/docs)

---

**Készítve:** 2025. október 6.
**Verzió:** 1.0.0
**Státusz:** ✅ Production Ready
