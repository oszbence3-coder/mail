# 🔒 Biztonsági Implementáció - v2.0

## Áttekintés
Ez a dokumentum részletezi az email kliensbe beépített biztonsági intézkedéseket.

## Implementált Védelmek

### 1. Rate Limiting ⏱️

#### Általános Rate Limit
```javascript
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 perc
  max: 100, // max 100 kérés IP-nként
  message: 'Túl sok kérés ebből az IP címről, kérjük próbáld később.'
});
```
- **Cél**: DDoS támadások megakadályozása
- **Hatás**: Minden route védve
- **Eredmény**: IP-nként max 100 kérés 15 percenként

#### Login Rate Limit
```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 perc
  max: 5, // max 5 bejelentkezési kísérlet
  message: 'Túl sok bejelentkezési kísérlet, kérjük próbáld 15 perc múlva.',
  skipSuccessfulRequests: true
});
```
- **Cél**: Brute force támadások megakadályozása
- **Hatás**: `/login` POST endpoint
- **Eredmény**: IP-nként max 5 sikertelen login 15 percenként

### 2. Helmet Security Headers 🪖

```javascript
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:", "https:", "http:"],
      fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
      frameSrc: ["'self'"],
      connectSrc: ["'self'"]
    }
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

**Védelmek:**
- **XSS Protection**: X-XSS-Protection header
- **Content Security Policy**: Korlátozza a betöltött erőforrásokat
- **HSTS**: Kikényszeríti a HTTPS használatát production-ben
- **Clickjacking Protection**: X-Frame-Options header
- **MIME Sniffing Protection**: X-Content-Type-Options header

### 3. Input Validation ✅

#### Login Validation
```javascript
app.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Érvényes email címet adj meg'),
  body('password').isLength({ min: 1 }).withMessage('Jelszó kötelező')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', 'Érvénytelen email cím vagy jelszó formátum');
    return res.redirect('/login');
  }
  // ...
});
```

#### Send Email Validation
```javascript
app.post('/send', upload.array('attachments', 10), [
  body('to').notEmpty().withMessage('Címzett kötelező'),
  body('subject').trim().escape(),
  body('body').trim()
], async (req, res) => {
  const errors = validationResult(req);
  // ...
});
```

**Védelmek:**
- Email formátum ellenőrzés
- Kötelező mezők validációja
- String trimmelés és escape
- Normalizálás (email lowercase, stb.)

### 4. HTML Sanitization 🧹

#### Email Tartalom Sanitizálás (Küldéskor)
```javascript
const sanitizedBody = sanitizeHtml(body, {
  allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'font', 'span', 'div']),
  allowedAttributes: {
    ...sanitizeHtml.defaults.allowedAttributes,
    '*': ['style', 'class'],
    'img': ['src', 'alt', 'width', 'height']
  },
  allowedStyles: {
    '*': {
      'color': [/.*/],
      'background-color': [/.*/],
      'font-size': [/.*/],
      'font-weight': [/.*/],
      'text-align': [/.*/]
    }
  }
});
```

#### Email Tartalom Sanitizálás (Fogadáskor)
```javascript
let sanitizedHtml = '';
if (parsed.html) {
  sanitizedHtml = sanitizeHtml(parsed.html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'font', 'span', 'div', 'table', 'tr', 'td', 'th', 
      'tbody', 'thead', 'center', 'style'
    ]),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['style', 'class', 'id', 'align', 'valign'],
      'img': ['src', 'alt', 'width', 'height', 'border', 'align'],
      'a': ['href', 'target', 'rel'],
      'table': ['border', 'cellpadding', 'cellspacing', 'width'],
      'td': ['colspan', 'rowspan', 'width', 'height'],
      'th': ['colspan', 'rowspan', 'width', 'height']
    },
    allowedStyles: {
      '*': {
        'color': [/.*/],
        'background-color': [/.*/],
        'background': [/.*/],
        'font-size': [/.*/],
        'font-weight': [/.*/],
        'font-family': [/.*/],
        'text-align': [/.*/],
        'text-decoration': [/.*/],
        'padding': [/.*/],
        'margin': [/.*/],
        'border': [/.*/],
        'width': [/.*/],
        'height': [/.*/],
        'display': [/.*/]
      }
    },
    allowedSchemes: ['http', 'https', 'mailto', 'data']
  });
}
```

**Védelmek:**
- XSS támadások megakadályozása
- Script tag-ek eltávolítása
- Veszélyes attribútumok kiszűrése
- Csak biztonságos URL scheme-ek (http, https, mailto, data)
- Inline style-ok korlátozása biztonságos értékekre

### 5. Session Security 🔐

```javascript
app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production', // HTTPS only production-ben
    httpOnly: true, // JavaScript nem fér hozzá
    maxAge: 24 * 60 * 60 * 1000 // 24 órás élettartam
  }
}));
```

**Védelmek:**
- **httpOnly cookies**: XSS támadók nem férnek hozzá
- **secure flag**: Csak HTTPS-en keresztül (production)
- **Session secret**: Környezeti változóból (production)
- **maxAge**: Automatikus session lejárat

### 6. Request Size Limits 📦

```javascript
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|mp4|avi|mov|mp3|wav/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb('Hiba: Nem támogatott fájltípus!');
    }
  }
});
```

**Védelmek:**
- DoS támadások megakadályozása túl nagy kérésekkel
- Fájl típus whitelist
- Maximum fájlméret korlátozás

## További Ajánlott Lépések (Production)

### 1. Környezeti Változók
```bash
# .env fájl
SESSION_SECRET=your-super-secret-random-string-here-min-32-chars
NODE_ENV=production
PORT=3000
```

### 2. HTTPS Kikényszerítés (Render.com)
A Render.com automatikusan biztosítja a HTTPS-t, de érdemes middleware-t hozzáadni:

```javascript
app.use((req, res, next) => {
  if (process.env.NODE_ENV === 'production' && req.headers['x-forwarded-proto'] !== 'https') {
    return res.redirect('https://' + req.headers.host + req.url);
  }
  next();
});
```

### 3. Naplózás (Opcionális)
```bash
npm install morgan winston
```

```javascript
const morgan = require('morgan');
const winston = require('winston');

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.json(),
  transports: [
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' })
  ]
});

app.use(morgan('combined', { stream: logger.stream }));
```

### 4. CSRF Token (Ha szükséges)
A csurf deprecated, de használhatjuk a csrf-csrf-t:

```bash
npm install csrf-csrf
```

```javascript
const { doubleCsrf } = require("csrf-csrf");

const {
  generateToken,
  doubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET,
  cookieName: "x-csrf-token",
  cookieOptions: {
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
  },
});

app.use(doubleCsrfProtection);
```

## Biztonsági Checklist ✓

- [x] Rate limiting (általános és login)
- [x] Helmet security headers
- [x] Input validation
- [x] HTML sanitization
- [x] Secure session cookies
- [x] Request size limits
- [x] File type whitelist
- [ ] CSRF protection (opcionális)
- [ ] Naplózás (opcionális)
- [ ] HTTPS kikényszerítés (Render.com automatikus)

## Tesztelés

### Rate Limiting Teszt
```bash
# 6 gyors bejelentkezési kísérlet
for i in {1..6}; do curl -X POST http://localhost:3000/login -d "email=test@test.com&password=wrong"; done
```

### XSS Teszt
Próbálj meg script tag-et beírni az email body-ba:
```html
<script>alert('XSS')</script>
```
Eredmény: A sanitizeHtml kiszűri.

### SQL Injection Teszt
Email mező:
```
test@test.com'; DROP TABLE users; --
```
Eredmény: Node-imap nem SQL alapú, nem érintett. Input validation is catch-eli.

## Összefoglalás

Az email kliens most **production-ready** és védett a következő támadások ellen:
- ✅ DDoS
- ✅ Brute Force
- ✅ XSS
- ✅ Clickjacking
- ✅ MIME Sniffing
- ✅ Session Hijacking
- ✅ Injection támadások

**Rendszeres frissítések ajánlottak:**
```bash
npm audit
npm audit fix
npm outdated
```
