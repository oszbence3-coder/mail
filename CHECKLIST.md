# ✅ Gyors Start Checklist

## 🎯 Lokális teszteléshez (Windows)

- [ ] **Node.js telepítve** (v18+)
  ```powershell
  node --version
  ```

- [ ] **NPM csomagok telepítve**
  ```powershell
  npm install
  ```

- [ ] **Szerver elindítva**
  ```powershell
  npm start
  ```

- [ ] **Böngésző megnyitása**
  ```
  http://localhost:3000
  ```

- [ ] **Gmail App Password generálva**
  - https://myaccount.google.com/apppasswords
  - 2FA bekapcsolva?
  - App Password kimásolva?

- [ ] **Bejelentkezés tesztelve**
  - Email: `youremail@gmail.com`
  - Password: `16-karakteres-app-password`

- [ ] **Inbox betöltődik?**

- [ ] **Email küldés működik?**

---

## 🚀 Render.com Deploy Checklist

- [ ] **GitHub repo létrehozva**
  ```powershell
  git init
  git add .
  git commit -m "Initial commit"
  git remote add origin https://github.com/USERNAME/REPO.git
  git push -u origin main
  ```

- [ ] **Render.com account létrehozva**
  - https://render.com

- [ ] **New Web Service létrehozva**
  - Repository csatlakoztatva
  - Build Command: `npm install`
  - Start Command: `npm start`

- [ ] **Environment Variables beállítva**
  - `SESSION_SECRET`: random string generálva
  - `NODE_ENV`: `production`

- [ ] **Deploy elindítva**
  - Logs követése
  - Sikeres deployment?

- [ ] **App URL megnyitva**
  - `https://your-app.onrender.com`

- [ ] **Bejelentkezés tesztelve éles környezetben**

- [ ] **Email olvasás működik?**

- [ ] **Email küldés működik?**

---

## 🔧 Troubleshooting Checklist

### "Cannot connect to IMAP"
- [ ] Gmail App Password használva? (NEM normál jelszó)
- [ ] 2FA be van kapcsolva Google Account-on?
- [ ] App Password másolva helyesen? (szóközök nélkül)
- [ ] imap.gmail.com port 993 elérhető?

### "SMTP Send Error"
- [ ] Ugyanaz mint IMAP
- [ ] smtp.gmail.com port 587 elérhető?
- [ ] "Less secure app access" NINCS bekapcsolva (App Password kell)

### "Session lost after refresh"
- [ ] SESSION_SECRET környezeti változó beállítva?
- [ ] Cookie settings OK?

### "Render.com deploy failed"
- [ ] package.json helyes?
- [ ] Node version kompatibilis? (18+)
- [ ] Build logs ellenőrizve?

### "Application not responding on Render"
- [ ] Free tier? → Első request után 30s cold start
- [ ] Logs-ban látható error?
- [ ] PORT environment variable NEM manuálisan beállítva?

---

## 📋 Pre-Launch Checklist (Éles környezet)

- [ ] **Biztonság**
  - [ ] SESSION_SECRET erős, random
  - [ ] OAuth2 implementálva (ajánlott)
  - [ ] Rate limiting beállítva
  - [ ] CORS megfelelően konfigurálva

- [ ] **Performance**
  - [ ] Connection pooling (opcionális)
  - [ ] Error handling minden route-ban
  - [ ] Logging beállítva

- [ ] **Monitoring**
  - [ ] Render Dashboard ismertetése
  - [ ] Uptime monitoring beállítása
  - [ ] Error tracking (Sentry?)

- [ ] **Dokumentáció**
  - [ ] README.md frissítve
  - [ ] API endpoints dokumentálva
  - [ ] Deployment guide kész

---

## 🎉 Success Criteria

✅ **Lokálisan fut hibátlanul**
✅ **Render.com-on deploy-olva**
✅ **HTTPS működik automatikusan**
✅ **Gmail IMAP/SMTP csatlakozás OK**
✅ **Email olvasás működik**
✅ **Email küldés működik**
✅ **UI responsive és professzionális**
✅ **Session kezelés működik**
✅ **Error handling megfelelő**

---

**Status:** 🚀 Ready for Production!
**Last Updated:** 2025-10-06
