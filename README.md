# 📧 Magyar Osu Mapek Email Client v2.0

**Teljes értékű, professzionális email kliens** Node.js + Express alapon, Gmail IMAP/SMTP támogatással és custom domain aliasokkal. **Magyar Osu Mapek themed design** 🎮

## ✨ Funkciók

### ⚡ Email Kezelés
- ✅ **Gmail IMAP** - Email olvasás teljes HTML támogatással
- ✅ **Gmail SMTP** - Email küldés custom domain aliasokkal
- ✅ **Reply (Válasz)** - Válaszolás emailekre
- ✅ **Forward (Továbbítás)** - Emailek továbbítása
- ✅ **HTML Email megjelenítés** - Biztonságos iframe-ben sötét/világos móddal
- ✅ **Csatolmányok** - Teljes körű támogatás (képek, videók, hangok, PDF, Office)
- ✅ **CC/BCC** - Másolat és titkos másolat támogatás
- ✅ **Message Snippets** - Email előnézetek az inbox listában
- ✅ **Folder Navigation** - Inbox, Sent, Spam, Trash mappák

### 🔒 Biztonság (v2.0)
- ✅ **Rate Limiting** - DDoS és brute force védelem
- ✅ **Helmet Security Headers** - CSP, HSTS, XSS védelem
- ✅ **Input Validation** - Express-validator minden formon
- ✅ **HTML Sanitization** - Biztonságos email tartalom megjelenítés
- ✅ **Session Security** - HttpOnly cookies, secure flag production-ben
- ✅ **Request Size Limits** - Max 50MB csatolmányok
- ✅ **CSRF Protection Ready** - Előkészítve token alapú védelem

### 📎 Fájlkezelés (v2.0)
- ✅ **Képek** - JPEG, PNG, GIF (inline preview, kattintható nagyítás)
- ✅ **Videók** - MP4, AVI, MOV (beépített video player)
- ✅ **Hang** - MP3, WAV (beépített audio player)
- ✅ **PDF** - Iframe előnézet
- ✅ **Word** - DOCX, DOC (letöltés szép kártyával)
- ✅ **Excel** - XLSX, XLS (letöltés szép kártyával)
- ✅ **PowerPoint** - PPTX, PPT (letöltés szép kártyával)
- ✅ **Archívumok** - ZIP, RAR, 7Z
- ✅ **Max méret** - 50MB/fájl

### 🎨 Custom Domain Aliasok
- ✅ **@magyarosumapek.hu** → Gmail mapping
- ✅ Példa: `barnix@magyarosumapek.hu` → `barnix.magyarosumapek@gmail.com`
- ✅ Automatikus email from alias (Magyar Osu Mapek névvel)
- ✅ Display email mindig custom domain

### 🎮 Magyar Osu Mapek Design
- ✅ **5 színséma**: Kék, Zöld, Lila, Rózsaszín, Narancs
- ✅ **Gradient háttér** - Animated theme switching
- ✅ **Tailwind CSS** - Modern, responsive design
- ✅ **Font Awesome ikonok** - Professzionális UI
- ✅ **Floating particles & orbs** - Minden oldalon
- ✅ **Loading/Logout Screens** - Animált átmenetek
- ✅ **Social linkek**: Discord, Osu!, Twitch, TikTok, YouTube

### 🚀 Production Ready
- ✅ **Render.com optimalizálva** - Auto deploy
- ✅ **Session-based auth** - Biztonságos autentikáció
- ✅ **Flash messages** - User feedback
- ✅ **Error handling** - Teljes hibakezelés
- ✅ **Security hardened** - Publikus deployment-re kész

## 🎯 Gyors Start (Windows PowerShell)

```powershell
# Függőségek telepítése
npm install

# Szerver indítása
npm start
```

Elérhető: http://localhost:3000

## 🔐 Bejelentkezés

### Custom Domain Aliasok
A `server.js`-ben definiálva:

```javascript
const DOMAIN_MAPPING = {
  'barnix@magyarosumapek.hu': 'barnix.magyarosumapek@gmail.com',
  'pandor@magyarosumapek.hu': 'pandor.magyarosumapek@gmail.com',
  // Add more...
};
```

### Gmail App Password
**Kötelező!** A normál jelszó **NEM** fog működni.

**Lépések:**
1. Google Account → Security
2. 2-Step Verification bekapcsolása
3. App passwords generálása
4. 16 karakteres jelszó használata

**Bejelentkezés:**
- Email: `barnix@magyarosumapek.hu` (vagy `barnix.magyarosumapek@gmail.com`)
- Password: `16-char-app-password`

## 📦 Render.com Deploy

### 1. GitHub Repository

```powershell
git init
git add .
git commit -m "Magyar Osu Mapek Email Client"
git remote add origin https://github.com/USERNAME/osu-email.git
git push -u origin main
```

### 2. Render.com Settings

- **Build Command:** `npm install`
- **Start Command:** `npm start`
- **Environment Variables:**
  ```
  SESSION_SECRET=random-secret-string-here
  NODE_ENV=production
  ```

### 3. Auto Deploy
Minden `git push` automatikusan újratelepíti az appot!

## 🎨 Témák (Themes)

Az alkalmazás 5 színsémát támogat:
- 🔵 **Kék** (alapértelmezett)
- 🟢 **Zöld**
- 🟣 **Lila**
- 🩷 **Rózsaszín**
- 🟠 **Narancs**

A választás localStorage-ban mentődik.

## 📁 Projekt Struktúra

```
IMAP/
├── server.js                 # Main backend (IMAP/SMTP + custom domains)
├── package.json              # Dependencies
├── .env                      # Environment variables
├── views/                    # EJS templates
│   ├── login.ejs             # Bejelentkezés (animated particles)
│   ├── inbox.ejs             # Email lista
│   ├── message.ejs           # Email megjelenítés (HTML support)
│   └── compose.ejs           # Új email / Reply / Forward
├── public/                   # Static files
└── docs/
    ├── README.md
    ├── RENDER_DEPLOY.md
    ├── PROJECT_STRUCTURE.md
    └── CHECKLIST.md
```

## 🔧 Technológiák

### Backend
- **Node.js** - Runtime
- **Express** - Web framework
- **imap** - IMAP protokoll
- **nodemailer** - SMTP email küldés
- **mailparser** - Email parsing (HTML support)
- **express-session** - Session management
- **connect-flash** - Flash messages

### Frontend
- **EJS** - Template engine
- **Tailwind CSS** - Utility-first CSS
- **Font Awesome** - Icons
- **Vanilla JS** - Theme management

## 📧 Email Funkciók Részletesen

### Inbox
- Email lista táblázatban
- Feladó, Tárgy, Dátum
- Csatolmány ikon ha van attachment
- Kattintható sorok

### Email Olvasás
- **HTML email**: Biztonságos iframe-ben (sandbox)
- **Text email**: Monospace formázással
- **Metaadatok**: From, To, CC, Date
- **Csatolmányok**: Lista fájlnévvel és mérettel
- **Reply gomb**: Válaszolás ugyanarra a címre
- **Forward gomb**: Továbbítás másnak

### Email Írás
- **To, CC, BCC** mezők
- **Tárgy** (Subject)
- **Üzenet** (Body) - textarea
- **Reply mode**: Eredeti üzenet quote-olva
- **Forward mode**: Eredeti üzenet továbbítva
- **Custom from**: `Magyar Osu Mapek <alias@magyarosumapek.hu>`

## ⚙️ Környezeti Változók

`.env` fájl tartalma:

```env
SESSION_SECRET=valami-random-titkos-string
NODE_ENV=development
PORT=3000
```

**Production (Render.com):**
- `SESSION_SECRET`: Erős random string
- `NODE_ENV`: `production`
- `PORT`: Render automatikusan állítja

## 🔒 Biztonság

### Session Management
- `express-session` middleware
- Session cookie (httpOnly)
- Credentials titkosítva session-ben

### HTML Email Biztonság
- **iframe sandbox**: `allow-same-origin` only
- **srcdoc** attribútum: XSS védelem
- **Content isolation**: Iframe-ben izolálva

### Éles Környezet (Ajánlott)
- ⚠️ OAuth2 implementálása (jövőbeli feature)
- ⚠️ Session store (Redis) használata
- ⚠️ HTTPS kötelező (Render automatikusan biztosítja)
- ⚠️ Rate limiting
- ⚠️ CSRF protection

## 📊 Custom Domain Mapping Példa

```javascript
// server.js
const DOMAIN_MAPPING = {
  'info@magyarosumapek.hu': 'info.magyarosumapek@gmail.com',
  'support@magyarosumapek.hu': 'support.magyarosumapek@gmail.com',
  'admin@magyarosumapek.hu': 'admin.magyarosumapek@gmail.com',
};
```

**Működés:**
1. User belép: `info@magyarosumapek.hu` + app password
2. Backend IMAP-ra csatlakozik: `info.magyarosumapek@gmail.com`
3. UI mindig mutatja: `info@magyarosumapek.hu`
4. Email küldésnél From: `Magyar Osu Mapek <info@magyarosumapek.hu>`

## 🐛 Troubleshooting

### "IMAP Connection Error"
- ✅ Gmail App Password használva?
- ✅ 2FA bekapcsolva a Google Account-on?
- ✅ App Password helyesen másolva?
- ✅ imap.gmail.com:993 elérhető?

### "SMTP Send Error"
- ✅ Ugyanaz mint IMAP
- ✅ smtp.gmail.com:587 elérhető?

### "Session Lost"
- ✅ SESSION_SECRET beállítva?
- ✅ Cookie settings megfelelőek?

### "HTML Email Nem Jelenik Meg"
- ✅ Iframe sandbox engedélyezett?
- ✅ Browser console log ellenőrzése

## 🚀 Jövőbeli Fejlesztések

- [ ] OAuth2 Google autentikáció
- [ ] Email keresés (search/filter)
- [ ] Mappák (Sent, Drafts, Spam, Trash)
- [ ] Email törlése / flagging
- [ ] Attachment letöltés
- [ ] Rich text editor (HTML compose)
- [ ] Multi-account support
- [ ] Real-time notifications (WebSocket)
- [ ] Dark mode toggle
- [ ] Email draft mentés

## 📜 Licenc

MIT

---

**Készítette:** Pandor  
**Projekt:** Magyar Osu Mapek  
**Verzió:** 2.0.0  
**Utolsó frissítés:** 2025. október 6.

🎮 **Osu!** | 📧 **Email Client** | 🚀 **Render.com Ready**
