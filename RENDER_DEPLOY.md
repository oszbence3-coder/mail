# 🚀 Render.com Deployment Guide

## Gyors telepítés lépésről lépésre

### 1️⃣ GitHub Repository létrehozása

```powershell
# Git inicializálás (ha még nem tetted)
git init
git add .
git commit -m "Initial commit: IMAP email client"

# GitHub repo létrehozása után
git remote add origin https://github.com/USERNAME/imap-email-client.git
git branch -M main
git push -u origin main
```

### 2️⃣ Render.com konfiguráció

1. **Menj a [render.com](https://render.com)** oldalra és jelentkezz be
2. Kattints a **"New +"** → **"Web Service"**
3. Csatold a GitHub repository-dat

### 3️⃣ Beállítások Render.com-on

#### Build & Deploy Settings:
- **Name:** `imap-email-client` (vagy tetszőleges)
- **Environment:** `Node`
- **Region:** `Frankfurt (EU Central)` vagy közeli
- **Branch:** `main`
- **Build Command:** `npm install`
- **Start Command:** `npm start`

#### Environment Variables (Add változók):
```
SESSION_SECRET=YOUR_RANDOM_SECRET_STRING_HERE_GENERATE_ONE
NODE_ENV=production
```

**SESSION_SECRET generálása:**
PowerShell-ben:
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 32 | ForEach-Object {[char]$_})
```

#### Pricing:
- **Free tier** is működik (spórol az erőforrásokon, de elég a teszteléshez)
- **Starter ($7/mo)** ajánlott éles használatra

### 4️⃣ Deploy indítása

Kattints a **"Create Web Service"** gombra!

Render.com automatikusan:
- Klónozza a repo-t
- Futtatja `npm install`-t
- Elindítja `npm start`-tal
- Élő URL-t biztosít: `https://your-app.onrender.com`

### 5️⃣ Automatikus újratelepítés

Minden push a `main` ágra automatikusan újratelepíti az appot!

```powershell
git add .
git commit -m "Update feature"
git push
# Render automatikusan újratelepít
```

### 6️⃣ Gmail App Password használata

A telepített alkalmazáson:
1. Nyisd meg: `https://your-app.onrender.com`
2. Kattints **"Bejelentkezés"**
3. Email: `yourname@gmail.com`
4. Password: **16 karakteres App Password** (NEM a normál jelszó!)

**App Password generálása:**
- https://myaccount.google.com/apppasswords
- Válaszd: Mail + Other device
- Másold ki a generált jelszót (16 karakter szóközök nélkül)

### ⚠️ Fontos megjegyzések

- **Free tier:** 15 perc inaktivitás után "alvó" módba lép, első request után újraindul (~30 sec)
- **Starter tier:** Folyamatosan fut, gyorsabb
- **HTTPS:** Render automatikusan ad SSL-t
- **Logs:** Render Dashboard → Logs menüben követheted a működést

### 🔧 Troubleshooting

#### "Application failed to respond"
- Ellenőrizd a Logs-ban, hogy elindult-e a szerver
- PORT environment változót NE állítsd be manuálisan (Render automatikusan kezeli)

#### "IMAP timeout" vagy "SMTP error"
- Gmail App Password helyes?
- Kétfaktoros hitelesítés be van kapcsolva?
- Tűzfal/Network restrictions?

#### Session elvesznek
- SESSION_SECRET be van állítva?
- Cookie settings megfelelőek production-ben?

### 📊 Monitoring

Render Dashboard-on láthatod:
- CPU/Memory használatot
- Request count-ot
- Uptime-ot
- Deploy history-t

### 🎉 Kész!

Az email kliens most élesben fut Render.com-on, automatikus deploy-al és HTTPS-sel!
