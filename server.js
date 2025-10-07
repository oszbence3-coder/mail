const express = require('express');
const session = require('express-session');
const flash = require('connect-flash');
const path = require('path');
const Imap = require('imap');
const { simpleParser } = require('mailparser');
const nodemailer = require('nodemailer');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { body, validationResult } = require('express-validator');
const sanitizeHtml = require('sanitize-html');
const mammoth = require('mammoth');
const marked = require('marked');
const { promisify } = require('util');
// const pdfParse = require('pdf-parse'); // Commented out due to DOMMatrix compatibility issues in Node.js
require('dotenv').config();

// Promisify simpleParser for async/await usage
const simpleParserAsync = promisify(simpleParser);

const app = express();
const PORT = process.env.PORT || 3000;

// Trust proxy for accurate IP detection behind reverse proxy (Render.com)
app.set('trust proxy', 1);

// Configure multer for file uploads (support more file types including audio)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|txt|zip|rar|mp4|avi|mov|mp3|wav|ogg|flac|aac|m4a|wma/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype) || file.mimetype.startsWith('audio/');
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Nem támogatott fájltípus!'));
    }
  }
});

// Custom domain to Gmail mapping
const DOMAIN_MAPPING = {
  'barnix@magyarosumapek.hu': 'barnix.magyarosumapek@gmail.com',
  'pandor@magyarosumapek.hu': 'magyarosumapok@gmail.com',
  // Add more custom domain mappings here
};

// Reverse mapping for display
const GMAIL_TO_DOMAIN = {};
Object.keys(DOMAIN_MAPPING).forEach(domain => {
  GMAIL_TO_DOMAIN[DOMAIN_MAPPING[domain]] = domain;
});

function getGmailAddress(customEmail) {
  return DOMAIN_MAPPING[customEmail.toLowerCase()] || customEmail;
}

function getDisplayEmail(gmailAddress) {
  return GMAIL_TO_DOMAIN[gmailAddress.toLowerCase()] || gmailAddress;
}

// Security Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net", "https://cdn.tailwindcss.com"],
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

app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Túl sok kérés ebből az IP címről, kérjük próbáld később.'
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 login attempts per windowMs
  message: 'Túl sok bejelentkezési kísérlet, kérjük próbáld 15 perc múlva.',
  skipSuccessfulRequests: true
});

app.use(limiter);

// Middleware
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(session({
  secret: process.env.SESSION_SECRET || 'dev-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(flash());

// Make flash messages available in all views
app.use((req, res, next) => {
  res.locals.messages = req.flash();
  res.locals.user = req.session.user;
  next();
});

// Helper: Connect to IMAP
function connectIMAP(email, password) {
  return new Promise((resolve, reject) => {
    const imap = new Imap({
      user: email,
      password: password,
      host: 'imap.gmail.com',
      port: 993,
      tls: true,
      tlsOptions: { rejectUnauthorized: false },
      connTimeout: 30000, // 30 seconds
      authTimeout: 30000  // 30 seconds
    });

    imap.once('ready', () => resolve(imap));
    imap.once('error', (err) => reject(err));
    imap.connect();
  });
}

// Helper: Fetch emails from a folder with pagination and read status
async function fetchEmails(email, password, page = 1, limit = 20, folder = 'INBOX', searchQuery = '') {
  const imap = await connectIMAP(email, password);
  
  return new Promise((resolve, reject) => {
    imap.openBox(folder, true, (err, box) => {
      if (err) {
        imap.end();
        return reject(err);
      }

      const total = box.messages.total;
      if (total === 0) {
        imap.end();
        return resolve({ messages: [], total: 0, page, totalPages: 0 });
      }

      // Build search criteria based on search query
      let searchCriteria = ['ALL'];
      if (searchQuery && searchQuery.trim()) {
        // Fix: Use multiple separate searches and merge results for SUBJECT, FROM, TO, BODY
        const searchFields = ['SUBJECT', 'FROM', 'TO', 'BODY'];
        let allResults = [];
        let completed = 0;
        let errorOccurred = false;

        searchFields.forEach(field => {
          imap.search([[field, searchQuery]], (err, res) => {
            if (errorOccurred) return;
            if (err) {
              errorOccurred = true;
              imap.end();
              return reject(err);
            }
            allResults = allResults.concat(res);
            completed++;
            if (completed === searchFields.length) {
              // Remove duplicates and sort
              const results = Array.from(new Set(allResults)).sort((a, b) => b - a);
              const totalPages = Math.ceil(results.length / limit);
              const startIdx = (page - 1) * limit;
              const uids = results.slice(startIdx, startIdx + limit);
              if (uids.length === 0) {
                imap.end();
                return resolve({ messages: [], total: results.length, page, totalPages });
              }
              const fetch = imap.fetch(uids, {
                bodies: '', // Fetch full email body for proper parsing
                struct: true,
                markSeen: false
              });
              const messages = [];
              fetch.on('message', (msg, seqno) => {
                let uid = null;
                let flags = [];
                let buffer = '';
                msg.once('attributes', (attrs) => {
                  uid = attrs.uid;
                  flags = attrs.flags || [];
                });
                msg.on('body', (stream) => {
                  stream.on('data', (chunk) => {
                    buffer += chunk.toString('utf8');
                  });
                });
                msg.once('end', () => {
                  simpleParser(buffer, { encoding: 'utf-8' }, (err, parsed) => {
                    if (err) {
                      console.error('Parse error:', err);
                      return;
                    }
                    // Snippet: első 80 karakter a text vagy html-ből
                    let snippet = '';
                    if (parsed.text && parsed.text.trim()) {
                      snippet = parsed.text.replace(/\s+/g, ' ').trim().substring(0, 80);
                    } else if (parsed.html && parsed.html.trim()) {
                      // HTML-ből szöveg kiszedése
                      const tmp = parsed.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                      snippet = tmp.substring(0, 80);
                    }
                    messages.push({
                      uid: uid,
                      seqno: seqno,
                      from: parsed.from ? parsed.from.text : '',
                      subject: parsed.subject || '(nincs tárgy)',
                      date: parsed.date || new Date(),
                      dateFormatted: parsed.date ? parsed.date.toLocaleString('hu-HU') : '',
                      hasAttachments: parsed.attachments && parsed.attachments.length > 0,
                      isRead: flags.includes('\\Seen'),
                      snippet: snippet,
                      text: parsed.text || '',
                      html: parsed.html || ''
                    });
                  });
                });
              });
              fetch.once('error', (err) => {
                imap.end();
                return reject(err);
              });
              fetch.once('end', () => {
                // Kis késleltetés a parsing befejezésére
                setTimeout(() => {
                  imap.end();
                  // Dátum szerinti rendezés DESC (legújabb elől)
                  messages.sort((a, b) => {
                    if (!a.date && !b.date) return 0;
                    if (!a.date) return 1;
                    if (!b.date) return -1;
                    return b.date - a.date;
                  });
                  resolve({ messages, total: results.length, page, totalPages });
                }, 3000); // Increased delay to ensure parsing completes
              });
            }
          });
        });
        return; // Exit early for search queries
      }

      imap.search(searchCriteria, (err, results) => {
        if (err) {
          imap.end();
          return reject(err);
        }
        results = results.sort((a, b) => b - a);
        const totalPages = Math.ceil(results.length / limit);
        const startIdx = (page - 1) * limit;
        const uids = results.slice(startIdx, startIdx + limit);
        if (uids.length === 0) {
          imap.end();
          return resolve({ messages: [], total: results.length, page, totalPages });
        }
        const fetch = imap.fetch(uids, {
          bodies: 'HEADER.FIELDS (FROM TO SUBJECT DATE)',
          struct: true,
          markSeen: false
        });
        const messages = [];
        fetch.on('message', (msg, seqno) => {
          let uid = null;
          let flags = [];
          let buffer = '';
          msg.once('attributes', (attrs) => {
            uid = attrs.uid;
            flags = attrs.flags || [];
          });
          msg.on('body', (stream) => {
            stream.on('data', (chunk) => {
              buffer += chunk.toString('binary'); // Use binary to preserve original encoding
            });
          });
          msg.once('end', () => {
            simpleParser(buffer, { encoding: 'utf-8' }, (err, parsed) => {
              if (err) {
                console.error('Parse error:', err);
                return;
              }
              // Snippet: első 80 karakter a text vagy html-ből
              let snippet = '';
              if (parsed.text && parsed.text.trim()) {
                snippet = parsed.text.replace(/\s+/g, ' ').trim().substring(0, 80);
              } else if (parsed.html && parsed.html.trim()) {
                // HTML-ből szöveg kiszedése
                const tmp = parsed.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
                snippet = tmp.substring(0, 80);
              }
              messages.push({
                uid: uid,
                seqno: seqno,
                from: parsed.from ? parsed.from.text : '',
                subject: parsed.subject || '(nincs tárgy)',
                date: parsed.date || new Date(),
                dateFormatted: parsed.date ? parsed.date.toLocaleString('hu-HU') : '',
                hasAttachments: parsed.attachments && parsed.attachments.length > 0,
                isRead: flags.includes('\\Seen'),
                snippet: snippet,
                text: parsed.text || '',
                html: parsed.html || ''
              });
            });
          });
        });
        fetch.once('error', (err) => {
          imap.end();
          reject(err);
        });
        fetch.once('end', () => {
          // Kis késleltetés a parsing befejezésére
          setTimeout(() => {
            imap.end();
            // Dátum szerinti rendezés DESC (legújabb elől)
            messages.sort((a, b) => {
              if (!a.date && !b.date) return 0;
              if (!a.date) return 1;
              if (!b.date) return -1;
              return b.date - a.date;
            });
            resolve({ messages, total: results.length, page, totalPages });
          }, 3000); // Increased delay to ensure parsing completes
        });
      });
    });
  });
}

// Helper: Fetch single email with HTML support
async function fetchSingleEmail(email, password, uid, folder = 'INBOX') {
  const imap = await connectIMAP(email, password);

  return new Promise((resolve, reject) => {
    imap.openBox(folder, false, (err) => {
      if (err) {
        imap.end();
        return reject(err);
      }

      const fetch = imap.fetch([uid], { bodies: '', markSeen: true });
      let emailData = null;
      let buffer = '';

      fetch.on('message', (msg) => {
        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            buffer += chunk.toString('binary'); // Use binary to preserve original encoding
          });
        });
        
        msg.once('end', async () => {
          try {
            const parsed = await simpleParser(buffer, { 
              encoding: 'utf-8',
              timeout: 10000 // 10 seconds timeout for parsing
            });
            // Sanitize HTML content for safer rendering
            let sanitizedHtml = '';
            if (parsed.html) {
              sanitizedHtml = sanitizeHtml(parsed.html, {
                allowedTags: sanitizeHtml.defaults.allowedTags.concat([
                  'img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
                  'font', 'span', 'div', 'table', 'tr', 'td', 'th', 
                  'tbody', 'thead', 'center'
                  // 'style' tag removed due to XSS vulnerability
                ]),
                allowVulnerableTags: true, // Acknowledge inline style attributes risk
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

            emailData = {
              uid: uid,
              from: parsed.from ? parsed.from.text : '',
              to: parsed.to ? parsed.to.text : '',
              cc: parsed.cc ? parsed.cc.text : '',
              subject: parsed.subject || '(nincs tárgy)',
              date: parsed.date ? parsed.date.toLocaleString('hu-HU', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
              }) : '',
              textBody: parsed.text || '',
              htmlBody: sanitizedHtml,
              attachments: parsed.attachments || [],
              messageId: parsed.messageId,
              inReplyTo: parsed.inReplyTo,
              references: parsed.references,
              // extra mezők a debughoz
              text: parsed.text || '',
              html: sanitizedHtml
            };
          } catch (parseErr) {
            console.error('Parse error:', parseErr);
          }
        });
      });

      fetch.once('error', (err) => {
        imap.end();
        reject(err);
      });

      fetch.once('end', () => {
        setTimeout(() => {
          imap.end();
          if (emailData) {
            resolve(emailData);
          } else {
            // Ha nincs emailData, akkor alapértelmezett értékekkel térünk vissza
            console.warn('Email parsing incomplete, returning default values');
            resolve({
              uid: uid,
              from: '',
              to: '',
              cc: '',
              subject: '(nincs tárgy)',
              date: new Date().toLocaleString('hu-HU'),
              textBody: 'Az email tartalma nem tölthető be.',
              htmlBody: '',
              attachments: [],
              messageId: null,
              inReplyTo: null,
              references: null,
              text: '',
              html: ''
            });
          }
        }, 5000); // Increased delay to ensure parsing completes
      });
    });
  });
}

// Helper: Get display name from email
function getDisplayName(email) {
  const username = email.split('@')[0];
  // Capitalize first letter
  return username.charAt(0).toUpperCase() + username.slice(1);
}

// Helper: Send email via SMTP with custom domain alias and attachments
async function sendEmail(email, password, to, subject, body, options = {}) {
  const displayEmail = getDisplayEmail(email);
  
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: email,
      pass: password
    },
    connectionTimeout: 60000, // 60 seconds
    socketTimeout: 60000     // 60 seconds
  });

  const mailOptions = {
    from: displayEmail,
    to: to,
    subject: subject,
    text: body,
    inReplyTo: options.inReplyTo || null,
    references: options.references || null,
    attachments: options.attachments || [],
    cc: options.cc || null,
    bcc: options.bcc || null,
    // Force quoted-printable encoding for UTF-8 characters
    textEncoding: 'quoted-printable',
    subjectEncoding: 'quoted-printable',
    headers: {
      'Content-Type': 'text/plain; charset=UTF-8'
    }
  };

  await transporter.sendMail(mailOptions);
}

// Routes
app.get('/', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.redirect('/inbox');
});

app.get('/login', (req, res) => {
  res.render('login');
});

app.post('/login', loginLimiter, [
  body('email').isEmail().normalizeEmail().withMessage('Érvényes email címet adj meg'),
  body('password').isLength({ min: 1 }).withMessage('Jelszó kötelező')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', 'Érvénytelen email cím vagy jelszó formátum');
    return res.redirect('/login');
  }
  
  const { email, password } = req.body;
  
  // Convert custom domain to Gmail
  const gmailAddress = getGmailAddress(email);
  const displayEmail = getDisplayEmail(gmailAddress);
  
  try {
    // Test IMAP connection
    const imap = await connectIMAP(gmailAddress, password);
    imap.end();
    
    req.session.user = { 
      email: gmailAddress,
      displayEmail: displayEmail,
      password 
    };
    req.flash('success', 'Sikeres bejelentkezés!');
    // Render loading page first
    res.render('loading', { displayEmail });
  } catch (error) {
    req.flash('error', 'Bejelentkezés sikertelen: ' + error.message);
    res.redirect('/login');
  }
});

app.get('/logout', (req, res) => {
  const displayEmail = req.session.user ? req.session.user.displayEmail : 'Unknown';
  req.session.destroy();
  res.render('logout', { displayEmail });
});

app.get('/inbox', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.search || '';
    const result = await fetchEmails(
      req.session.user.email,
      req.session.user.password,
      page,
      20,
      'INBOX',
      searchQuery
    );
    res.render('inbox', { 
      messages: result.messages,
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.total,
      folder: 'inbox',
      folderName: 'Beérkezett',
      searchQuery: searchQuery
    });
  } catch (error) {
    req.flash('error', 'Nem sikerült betölteni a leveleket: ' + error.message);
    res.render('inbox', { messages: [], currentPage: 1, totalPages: 1, total: 0, folder: 'inbox', folderName: 'Beérkezett', searchQuery: '' });
  }
});

app.get('/sent', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.search || '';
    const result = await fetchEmails(
      req.session.user.email,
      req.session.user.password,
      page,
      20,
      '[Gmail]/Sent Mail',
      searchQuery
    );
    res.render('inbox', { 
      messages: result.messages,
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.total,
      folder: 'sent',
      folderName: 'Elküldött',
      searchQuery: searchQuery
    });
  } catch (error) {
    req.flash('error', 'Nem sikerült betölteni az elküldött leveleket: ' + error.message);
    res.render('inbox', { messages: [], currentPage: 1, totalPages: 1, total: 0, folder: 'sent', folderName: 'Elküldött', searchQuery: '' });
  }
});

app.get('/spam', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.search || '';
    const result = await fetchEmails(
      req.session.user.email,
      req.session.user.password,
      page,
      20,
      '[Gmail]/Spam',
      searchQuery
    );
    res.render('inbox', { 
      messages: result.messages,
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.total,
      folder: 'spam',
      folderName: 'Spam',
      searchQuery: searchQuery
    });
  } catch (error) {
    req.flash('error', 'Nem sikerült betölteni a spam leveleket: ' + error.message);
    res.render('inbox', { messages: [], currentPage: 1, totalPages: 1, total: 0, folder: 'spam', folderName: 'Spam', searchQuery: '' });
  }
});

app.get('/trash', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const page = parseInt(req.query.page) || 1;
    const searchQuery = req.query.search || '';
    const result = await fetchEmails(
      req.session.user.email,
      req.session.user.password,
      page,
      20,
      '[Gmail]/Trash',
      searchQuery
    );
    res.render('inbox', { 
      messages: result.messages,
      currentPage: result.page,
      totalPages: result.totalPages,
      total: result.total,
      folder: 'trash',
      folderName: 'Kuka',
      searchQuery: searchQuery
    });
  } catch (error) {
    req.flash('error', 'Nem sikerült betölteni a törölt leveleket: ' + error.message);
    res.render('inbox', { messages: [], currentPage: 1, totalPages: 1, total: 0, folder: 'trash', folderName: 'Kuka', searchQuery: '' });
  }
});

app.get('/message/:uid', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  
  try {
    // Get folder from query parameter, default to INBOX
    const folderParam = req.query.folder || 'inbox';
    const folderMap = {
      'inbox': 'INBOX',
      'sent': '[Gmail]/Sent Mail',
      'spam': '[Gmail]/Spam',
      'trash': '[Gmail]/Trash'
    };
    const imapFolder = folderMap[folderParam] || 'INBOX';
    
    const message = await fetchSingleEmail(
      req.session.user.email,
      req.session.user.password,
      parseInt(req.params.uid),
      imapFolder
    );
    
    if (!message) {
      req.flash('error', 'Az üzenet nem található');
      return res.redirect('/inbox');
    }
    
    res.render('message', { message, folder: folderParam });
  } catch (error) {
    console.error('Message error:', error);
    req.flash('error', 'Hiba az üzenet betöltésekor: ' + error.message);
    res.redirect('/inbox');
  }
});

app.get('/compose', (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  res.render('compose', { replyTo: null, forward: null });
});

app.get('/compose/reply/:uid', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const folderParam = req.query.folder || 'inbox';
    const folderMap = {
      'inbox': 'INBOX',
      'sent': '[Gmail]/Sent Mail',
      'spam': '[Gmail]/Spam',
      'trash': '[Gmail]/Trash'
    };
    const imapFolder = folderMap[folderParam] || 'INBOX';
    
    const original = await fetchSingleEmail(
      req.session.user.email,
      req.session.user.password,
      parseInt(req.params.uid),
      imapFolder
    );
    res.render('compose', { replyTo: original, forward: null });
  } catch (error) {
    req.flash('error', 'Nem sikerült betölteni az eredeti üzenetet');
    res.redirect('/inbox');
  }
});

app.get('/compose/forward/:uid', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const folderParam = req.query.folder || 'inbox';
    const folderMap = {
      'inbox': 'INBOX',
      'sent': '[Gmail]/Sent Mail',
      'spam': '[Gmail]/Spam',
      'trash': '[Gmail]/Trash'
    };
    const imapFolder = folderMap[folderParam] || 'INBOX';
    
    const original = await fetchSingleEmail(
      req.session.user.email,
      req.session.user.password,
      parseInt(req.params.uid),
      imapFolder
    );
    res.render('compose', { replyTo: null, forward: original });
  } catch (error) {
    req.flash('error', 'Nem sikerült betölteni az üzenetet');
    res.redirect('/inbox');
  }
});

app.post('/delete/:uid', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const imap = await connectIMAP(req.session.user.email, req.session.user.password);
    await new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, (err) => {
        if (err) return reject(err);
        
        // Move to trash instead of permanent delete
        imap.move(parseInt(req.params.uid), '[Gmail]/Trash', (err) => {
          imap.end();
          if (err) return reject(err);
          resolve();
        });
      });
    });
    
    req.flash('success', 'Email a kukába helyezve!');
    res.redirect('/inbox');
  } catch (error) {
    req.flash('error', 'Törlési hiba: ' + error.message);
    res.redirect('/inbox');
  }
});

// Mark as spam
app.post('/mark-spam/:uid', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const imap = await connectIMAP(req.session.user.email, req.session.user.password);
    await new Promise((resolve, reject) => {
      imap.openBox('INBOX', false, (err) => {
        if (err) return reject(err);
        
        imap.move(parseInt(req.params.uid), '[Gmail]/Spam', (err) => {
          imap.end();
          if (err) return reject(err);
          resolve();
        });
      });
    });
    
    req.flash('success', 'Email spam-nek jelölve!');
    res.redirect('/inbox');
  } catch (error) {
    req.flash('error', 'Hiba: ' + error.message);
    res.redirect('/inbox');
  }
});

// Restore from spam
app.post('/restore/:uid', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const folder = req.body.from || '[Gmail]/Spam';
    const imap = await connectIMAP(req.session.user.email, req.session.user.password);
    await new Promise((resolve, reject) => {
      imap.openBox(folder, false, (err) => {
        if (err) return reject(err);
        
        imap.move(parseInt(req.params.uid), 'INBOX', (err) => {
          imap.end();
          if (err) return reject(err);
          resolve();
        });
      });
    });
    
    req.flash('success', 'Email visszaállítva!');
    res.redirect('/inbox');
  } catch (error) {
    req.flash('error', 'Hiba: ' + error.message);
    res.redirect(req.get('referer') || '/inbox');
  }
});

// Permanent delete from trash
app.post('/delete-permanent/:uid', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const imap = await connectIMAP(req.session.user.email, req.session.user.password);
    await new Promise((resolve, reject) => {
      imap.openBox('[Gmail]/Trash', false, (err) => {
        if (err) return reject(err);
        
        imap.addFlags(parseInt(req.params.uid), ['\\Deleted'], (err) => {
          if (err) return reject(err);
          imap.expunge((err) => {
            imap.end();
            if (err) return reject(err);
            resolve();
          });
        });
      });
    });
    
    req.flash('success', 'Email véglegesen törölve!');
    res.redirect('/trash');
  } catch (error) {
    req.flash('error', 'Törlési hiba: ' + error.message);
    res.redirect('/trash');
  }
});

// Empty Trash - Delete all emails in trash
app.post('/empty-trash', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  try {
    const imap = await connectIMAP(req.session.user.email, req.session.user.password);
    await new Promise((resolve, reject) => {
      imap.openBox('[Gmail]/Trash', false, (err, box) => {
        if (err) return reject(err);
        
        if (box.messages.total === 0) {
          imap.end();
          return resolve();
        }
        
        // Search all messages in trash
        imap.search(['ALL'], (err, results) => {
          if (err) {
            imap.end();
            return reject(err);
          }
          
          if (results.length === 0) {
            imap.end();
            return resolve();
          }
          
          // Mark all as deleted
          imap.addFlags(results, ['\\Deleted'], (err) => {
            if (err) {
              imap.end();
              return reject(err);
            }
            
            // Expunge to permanently delete
            imap.expunge((err) => {
              imap.end();
              if (err) return reject(err);
              resolve();
            });
          });
        });
      });
    });
    
    req.flash('success', 'Kuka kiürítve! Minden levél véglegesen törölve.');
    res.redirect('/trash');
  } catch (error) {
    console.error('Empty trash error:', error);
    req.flash('error', 'Hiba a kuka ürítésekor: ' + error.message);
    res.redirect('/trash');
  }
});

// API endpoint for checking new emails (for realtime updates)
app.get('/api/check-new-emails', async (req, res) => {
  if (!req.session.user) {
    return res.json({ error: 'Not authenticated' });
  }

  try {
    const folder = req.query.folder || 'INBOX';
    const lastCount = parseInt(req.query.lastCount) || 0;
    
    const imap = await connectIMAP(req.session.user.email, req.session.user.password);
    
    const boxInfo = await new Promise((resolve, reject) => {
      imap.openBox(folder, true, (err, box) => {
        imap.end();
        if (err) return reject(err);
        resolve(box);
      });
    });
    
    const currentCount = boxInfo.messages.total;
    const hasNew = currentCount > lastCount;
    
    res.json({ 
      hasNew,
      currentCount,
      newCount: hasNew ? currentCount - lastCount : 0
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.post('/send', upload.array('attachments', 10), [
  body('to').notEmpty().withMessage('Címzett kötelező'),
  body('subject').trim().escape(),
  body('body').trim()
], async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    req.flash('error', 'Címzett mező kötelező');
    return res.redirect('/compose');
  }

  const { to, cc, bcc, subject, body, inReplyTo, references } = req.body;

  // Convert Markdown to HTML with UTF-8 support
  const htmlBody = marked.parse(body || '', {
    breaks: true,
    gfm: true,
    headerIds: false,
    mangle: false
  });

  // Ensure UTF-8 encoding for the HTML content
  const utf8HtmlBody = Buffer.from(htmlBody, 'utf8').toString('utf8');

  // Sanitize HTML content for email body with UTF-8 preservation
  const sanitizedBody = sanitizeHtml(utf8HtmlBody, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'strong', 'em', 'u', 'del', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'a', 'font', 'span', 'div', 'table', 'thead', 'tbody', 'tr', 'th', 'td']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      '*': ['style', 'class'],
      'img': ['src', 'alt', 'width', 'height'],
      'a': ['href', 'title'],
      'font': ['color', 'size', 'face']
    },
    allowedStyles: {
      '*': {
        'color': [/.*/],
        'background-color': [/.*/],
        'font-size': [/.*/],
        'font-weight': [/.*/],
        'font-style': [/.*/],
        'text-align': [/.*/],
        'text-decoration': [/.*/],
        'border': [/.*/],
        'border-collapse': [/.*/],
        'padding': [/.*/],
        'margin': [/.*/]
      }
    },
    allowVulnerableTags: false,
    enforceHtmlBoundary: false
  });

  // Create plain text version for text field (remove all HTML/Markdown)
  const plainTextBody = sanitizeHtml(utf8HtmlBody, {
    allowedTags: [],
    allowedAttributes: {}
  }).replace(/\n{3,}/g, '\n\n'); // Clean up excessive newlines

  try {
    const attachments = req.files ? req.files.map(file => ({
      filename: file.originalname,
      content: file.buffer
    })) : [];

    await sendEmail(
      req.session.user.email,
      req.session.user.password,
      to,
      subject,
      plainTextBody,
      { cc, bcc, inReplyTo, references, html: sanitizedBody, attachments }
    );
    req.flash('success', 'Üzenet sikeresen elküldve!');
    res.redirect('/inbox');
  } catch (error) {
    req.flash('error', 'Küldési hiba: ' + error.message);
    res.redirect('/compose');
  }
});

// Attachment download route
app.get('/attachment/:uid/:index', async (req, res) => {
  if (!req.session.user) return res.status(401).send('Unauthorized');
  try {
    const { uid, index } = req.params;
    const folderParam = req.query.folder || 'inbox';
    const folderMap = {
      'inbox': 'INBOX',
      'sent': '[Gmail]/Sent Mail',
      'spam': '[Gmail]/Spam',
      'trash': '[Gmail]/Trash'
    };
    const imapFolder = folderMap[folderParam] || 'INBOX';
    
    const email = await fetchSingleEmail(
      req.session.user.email,
      req.session.user.password,
      parseInt(uid),
      imapFolder
    );
    if (!email || !email.attachments || !email.attachments[index]) {
      return res.status(404).send('Attachment not found');
    }
    const att = email.attachments[index];
    res.setHeader('Content-Disposition', `attachment; filename="${att.filename}"`);
    res.setHeader('Content-Type', att.contentType || 'application/octet-stream');
    res.send(att.content);
  } catch (err) {
    res.status(500).send('Error downloading attachment');
  }
});

app.listen(PORT, () => {
  console.log(`✓ Magyar Osu Mapek Email Client running on http://localhost:${PORT}`);
});
