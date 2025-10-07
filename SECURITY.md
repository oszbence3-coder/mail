# 🔒 Biztonsági Áttekintés - Magyar Osu Mapek Email Client

## ⚠️ Jelenleg NEM biztonságos publikusan futtatni!

### Kritikus Biztonsági Problémák

#### 1. **Jelszó Tárolás** 🔴 KRITIKUS
- **Probléma**: Jelszavak plain text formában tárolva a session-ben
- **Kockázat**: Memory dump vagy session hijacking esetén kompromittálódnak
- **Megoldás**: OAuth2 implementálása vagy encrypted token használata

#### 2. **Rate Limiting Hiánya** 🔴 KRITIKUS
- **Probléma**: Nincs korlát a login kísérletekre
- **Kockázat**: Brute force támadás lehetséges
- **Megoldás**: 
  ```javascript
  const rateLimit = require('express-rate-limit');
  const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 perc
    max: 5, // 5 kísérlet
    message: 'Túl sok bejelentkezési kísérlet'
  });
  app.post('/login', loginLimiter, ...);
  ```

#### 3. **CSRF Védelem Hiánya** 🔴 KRITIKUS
- **Probléma**: Nincs CSRF token
- **Kockázat**: Cross-Site Request Forgery támadás
- **Megoldás**: `csurf` middleware használata
  ```javascript
  const csrf = require('csurf');
  app.use(csrf({ cookie: true }));
  ```

#### 4. **Input Validáció Hiánya** 🟠 MAGAS
- **Probléma**: Email címek, subject, body nincs validálva/sanitizálva
- **Kockázat**: XSS, injection támadások
- **Megoldás**: 
  ```javascript
  const validator = require('validator');
  const sanitizeHtml = require('sanitize-html');
  ```

#### 5. **Session Store** 🟠 MAGAS
- **Probléma**: Memory alapú session (minden restart elvész)
- **Kockázat**: Session fixation, nem skálázható
- **Megoldás**: Redis session store
  ```javascript
  const RedisStore = require('connect-redis')(session);
  const redis = require('redis');
  const redisClient = redis.createClient();
  app.use(session({
    store: new RedisStore({ client: redisClient }),
    ...
  }));
  ```

#### 6. **Email HTML XSS** 🟠 MAGAS
- **Probléma**: HTML emailek iframe-ben sandbox nélkül
- **Kockázat**: XSS támadás email-ből
- **Megoldás**: ✅ Már van sandbox="allow-same-origin"
  - További szigorítás: CSP headers

---

## ✅ Ami Már Jó

1. **HTTPS** - Render.com automatikusan biztosítja
2. **Gmail App Password** - Nem normál jelszó használata
3. **Session alapú auth** - Cookie-ban session ID
4. **Iframe sandbox** - HTML emailek izolálva
5. **Input type="email"** - Alapvető email validáció

---

## 🛡️ Biztonságossá Tétel - Lépések

### 1. OAuth2 Implementálása (LEGFONTOSABB)
```bash
npm install passport passport-google-oauth20
```

**Előnyök:**
- Nincs jelszó tárolás
- Google kezeli az autentikációt
- Refresh token-ek
- Jobb UX

### 2. Rate Limiting
```bash
npm install express-rate-limit
```

**Implementáció:**
```javascript
const rateLimit = require('express-rate-limit');

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true
});

app.use('/api/', apiLimiter);
app.post('/login', loginLimiter, ...);
```

### 3. CSRF Védelem
```bash
npm install csurf cookie-parser
```

**Implementáció:**
```javascript
const csrf = require('csurf');
const cookieParser = require('cookie-parser');

app.use(cookieParser());
app.use(csrf({ cookie: true }));

app.use((req, res, next) => {
  res.locals.csrfToken = req.csrfToken();
  next();
});
```

**EJS-ben:**
```html
<input type="hidden" name="_csrf" value="<%= csrfToken %>">
```

### 4. Input Sanitization
```bash
npm install validator sanitize-html
```

**Implementáció:**
```javascript
const validator = require('validator');
const sanitizeHtml = require('sanitize-html');

// Email validáció
if (!validator.isEmail(email)) {
  return res.status(400).send('Invalid email');
}

// HTML sanitization
const cleanHtml = sanitizeHtml(htmlBody, {
  allowedTags: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
  allowedAttributes: {
    'a': ['href']
  }
});
```

### 5. Redis Session Store
```bash
npm install redis connect-redis
```

**Implementáció:**
```javascript
const redis = require('redis');
const RedisStore = require('connect-redis')(session);
const redisClient = redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379
});

app.use(session({
  store: new RedisStore({ client: redisClient }),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: true, // HTTPS only
    httpOnly: true,
    maxAge: 1000 * 60 * 60 * 24 // 24 óra
  }
}));
```

### 6. Security Headers
```bash
npm install helmet
```

**Implementáció:**
```javascript
const helmet = require('helmet');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.tailwindcss.com"],
      imgSrc: ["'self'", "data:", "https:"],
      frameAncestors: ["'none'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### 7. Logging & Monitoring
```bash
npm install winston morgan
```

**Implementáció:**
```javascript
const winston = require('winston');
const morgan = require('morgan');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use(morgan('combined', { stream: { write: (msg) => logger.info(msg) } }));
```

---

## 📊 Biztonsági Checklist Éles Környezethez

### Alapvető
- [ ] OAuth2 implementálva
- [ ] Rate limiting minden route-on
- [ ] CSRF védelem
- [ ] Input validáció és sanitization
- [ ] Redis session store
- [ ] Helmet security headers
- [ ] HTTPS kényszerítés

### Haladó
- [ ] 2FA support
- [ ] Audit logging
- [ ] IP whitelist/blacklist
- [ ] DDoS védelem (Cloudflare)
- [ ] Regular security audits
- [ ] Dependency scanning (Snyk, Dependabot)
- [ ] WAF (Web Application Firewall)

### Email-specifikus
- [ ] Email content scanning (antivirus)
- [ ] Phishing detection
- [ ] Spam filtering
- [ ] Attachment size limits
- [ ] File type restrictions
- [ ] Sender verification (SPF, DKIM, DMARC)

---

## 🚨 Sürgős Figyelmeztetések

### ❌ NE használd éles környezetben így:
- Publikus internet elérés nélküli OAuth2
- Erős session secret nélkül
- Rate limiting nélkül
- HTTPS nélkül
- Input validáció nélkül

### ⚠️ Korlátozott használat:
- Saját VPN-en belül
- Trusted network-ön
- Fejlesztési célra
- Demo környezetben (rövid ideig)

### ✅ Biztonságos használat:
- Teljes OAuth2 implementáció után
- Rate limiting beállítva
- Redis session store-ral
- Security headers-ekkel
- Regular monitoring-gal
- Audit logging-gal

---

## 🔐 Jelszó vs OAuth2

### Jelenlegi (Jelszó alapú)
**Előnyök:**
- Egyszerű implementáció
- Gyors fejlesztés
- Offline működés

**Hátrányok:**
- Jelszó tárolás (session-ben)
- Bizalmas adat kezelés
- App Password generálás szükséges
- Felhasználó tudja a jelszót

### Ajánlott (OAuth2)
**Előnyök:**
- Nincs jelszó tárolás
- Google kezeli az autentikációt
- Automatikus token refresh
- Revoke lehetőség
- Scope-based permissions
- Audit trail Google-nél

**Hátrányok:**
- Komplexebb implementáció
- Google API Console setup
- Internet kapcsolat szükséges

---

## 📚 Hasznos Linkek

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)
- [Express Security Best Practices](https://expressjs.com/en/advanced/best-practice-security.html)
- [Gmail API OAuth2](https://developers.google.com/gmail/api/auth/about-auth)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)

---

## 💡 Összegzés

**Jelenlegi állapot:** 🔴 **NEM biztonságos publikusan**

**Minimális biztonság eléréséhez szükséges:**
1. OAuth2 implementálása
2. Rate limiting
3. CSRF védelem
4. Redis session store
5. Security headers

**Időigény:** ~2-3 nap teljes implementáció

**Alternatíva:** Használj enterprise email service-t (Gmail, Outlook, ProtonMail) hivatalosan, és csak internal tool-ként használd ezt lokálisan.

---

**Készítette:** GitHub Copilot  
**Utolsó frissítés:** 2025. október 6.  
**Státusz:** ⚠️ Security Review Required
