import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import session from "express-session";
import { generateSecret, verify, generateURI } from "otplib";
import QRCode from "qrcode";
import multer from "multer";
import fs from "fs";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
  }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for image uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes.'));
    }
  }
});

const db = new Database("blog.db");

// Initialize database with new schema fields (slug, seoKeywords, readingTime, metaDescription)
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP,
    slug TEXT UNIQUE,
    seoKeywords TEXT,
    readingTime INTEGER DEFAULT 5,
    metaDescription TEXT,
    views INTEGER DEFAULT 0,
    imageUrl TEXT
  );
  
  CREATE TABLE IF NOT EXISTS experience (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    company TEXT NOT NULL,
    role TEXT NOT NULL,
    period TEXT NOT NULL,
    description TEXT
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

// MIGRATION: Safely add new columns to existing database if they don't exist
const tableInfo = db.prepare("PRAGMA table_info(posts)").all() as { name: string }[];
const hasSlug = tableInfo.some(col => col.name === 'slug');
const hasMetaDescription = tableInfo.some(col => col.name === 'metaDescription');
const hasViews = tableInfo.some(col => col.name === 'views');
const hasImageUrl = tableInfo.some(col => col.name === 'imageUrl');

if (!hasImageUrl) {
  console.log("Migrating database: Adding imageUrl column to 'posts' table...");
  db.exec(`ALTER TABLE posts ADD COLUMN imageUrl TEXT;`);
}

if (!hasViews) {
  console.log("Migrating database: Adding views column to 'posts' table...");
  db.exec(`ALTER TABLE posts ADD COLUMN views INTEGER DEFAULT 0;`);
}

if (!hasSlug) {
  console.log("Migrating database: Adding new SEO columns to 'posts' table...");
  db.exec(`
    ALTER TABLE posts ADD COLUMN slug TEXT;
    ALTER TABLE posts ADD COLUMN seoKeywords TEXT;
    ALTER TABLE posts ADD COLUMN readingTime INTEGER DEFAULT 5;
  `);
  
  // Generate slugs for old posts
  const oldPosts = db.prepare("SELECT id, title FROM posts").all() as {id: number, title: string}[];
  const updateStmt = db.prepare("UPDATE posts SET slug = ?, seoKeywords = ?, readingTime = ? WHERE id = ?");
  
  for (const p of oldPosts) {
    const generatedSlug = p.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '') + '-' + p.id;
    updateStmt.run(generatedSlug, "contabilidad, finanzas, blog", 5, p.id);
  }
}

if (!hasMetaDescription) {
  console.log("Migrating database: Adding metaDescription column to 'posts' table...");
  db.exec(`
    ALTER TABLE posts ADD COLUMN metaDescription TEXT;
  `);
}

// Migrate old categories
db.exec(`
  UPDATE posts SET category = 'Financiero' WHERE category = 'Finanzas';
  UPDATE posts SET category = 'Contable' WHERE category = 'Contabilidad';
`);

// Rate limiters - Increased for admin usage
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased from 100
  message: { error: "Demasiadas peticiones desde esta IP, por favor inténtalo de nuevo más tarde." }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 50, // Increased from 10
  message: { error: "Demasiados intentos de inicio de sesión, por favor inténtalo de nuevo en una hora." }
});

const DEFAULT_PHOTO_URL = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800";

async function seedDatabase() {
  const seeded = db.prepare("SELECT value FROM settings WHERE key = 'database_seeded'").get() as { value: string } | undefined;
  if (seeded?.value === 'true') return;

  console.log("Seeding database with fallback data...");
  insertFallbackExperience();
  insertFallbackPosts();
  
  db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('database_seeded', 'true')").run();
}

function insertFallbackExperience() {
  const expCount = db.prepare("SELECT COUNT(*) as count FROM experience").get() as { count: number };
  if (expCount.count > 0) return;

  const insertExp = db.prepare("INSERT INTO experience (company, role, period, description) VALUES (?, ?, ?, ?)");
  insertExp.run(
    "Editor y Colaborador Especializado",
    "Especialista en Contenido Financiero y Laboral",
    "2010 - Actualidad",
    "Generación de contenido técnico y divulgativo sobre normativa contable, financiera y laboral para diversos portales profesionales y empresas del sector."
  );
  insertExp.run(
    "Asesoría y Gestión Empresarial",
    "Consultor Senior",
    "2000 - 2010",
    "Dirección y asesoramiento en materia fiscal, contable y laboral para PYMES, optimizando procesos de gestión y cumplimiento normativo."
  );
  insertExp.run(
    "Sector Bancario y Financiero",
    "Responsable de Análisis",
    "1990 - 2000",
    "Análisis de riesgos, control de gestión y supervisión de estados financieros en entidades de crédito."
  );
}

function insertFallbackPosts() {
  const postCount = db.prepare("SELECT COUNT(*) as count FROM posts").get() as { count: number };
  if (postCount.count > 0) return;

  const insertPost = db.prepare("INSERT INTO posts (title, content, category, slug, seoKeywords, readingTime, metaDescription) VALUES (?, ?, ?, ?, ?, ?, ?)");
  insertPost.run(
    "La importancia de la contabilidad analítica en la PYME",
    "La contabilidad analítica es una herramienta fundamental para la gestión interna. Permite conocer el coste real de cada producto o servicio y tomar decisiones basadas en datos precisos.",
    "Contable",
    "importancia-contabilidad-analitica-pyme",
    "contabilidad analítica, pyme, gestión interna, decisiones financieras, rentabilidad",
    6,
    "Descubre por qué la contabilidad analítica es vital para la gestión interna de tu PYME y cómo te ayuda a tomar mejores decisiones."
  );
  insertPost.run(
    "Novedades en la cotización de autónomos para 2024",
    "El nuevo sistema basado en ingresos reales introduce cambios significativos en las cuotas mensuales. Es fundamental planificar los rendimientos netos para evitar regularizaciones inesperadas.",
    "Laboral",
    "novedades-cotizacion-autonomos-2024",
    "autónomos, cotización 2024, ingresos reales, cuotas mensuales, laboral",
    4,
    "Conoce las principales novedades en la cotización de autónomos para 2024 y cómo planificar tus rendimientos netos."
  );
  insertPost.run(
    "Análisis de ratios financieros para el control de gestión",
    "Los ratios de liquidez y solvencia son vitales para asegurar la continuidad del negocio. Un análisis periódico permite detectar tensiones de tesorería antes de que sean críticas.",
    "Financiero",
    "analisis-ratios-financieros-control-gestion",
    "ratios financieros, liquidez, solvencia, control de gestión, tesorería",
    8,
    "Aprende a analizar los ratios financieros clave para el control de gestión y asegurar la liquidez y solvencia de tu empresa."
  );
}

async function startServer() {
  const dbPath = path.resolve("blog.db");
  console.log(`Database initialized at: ${dbPath}`);
  
  seedDatabase().catch(err => console.error("Background seeding failed:", err));
  
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
  app.set("trust proxy", 1);
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
  
  app.use(session({
    secret: process.env.SESSION_SECRET || "jose-ramon-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: true,
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
      sameSite: "none"
    }
  }));

  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session.authenticated) {
      next();
    } else {
      res.status(401).json({ error: "No autorizado" });
    }
  };

  app.get("/api/posts", apiLimiter, (req, res) => {
    const posts = db.prepare("SELECT * FROM posts ORDER BY date DESC").all();
    res.json(posts);
  });

  // NEW ENDPOINT: Get individual post by slug
  app.get("/api/posts/:slug", apiLimiter, (req, res) => {
    const { slug } = req.params;
    const post = db.prepare("SELECT * FROM posts WHERE slug = ?").get(slug);
    
    if (post) {
      db.prepare("UPDATE posts SET views = views + 1 WHERE slug = ?").run(slug);
      res.json(post);
    } else {
      res.status(404).json({ error: "Artículo no encontrado" });
    }
  });

  app.get("/api/author", apiLimiter, (req, res) => {
    const photo = db.prepare("SELECT value FROM settings WHERE key = ?").get("author_photo") as { value: string } | undefined;
    const name = db.prepare("SELECT value FROM settings WHERE key = ?").get("author_name") as { value: string } | undefined;
    res.json({ 
      name: name?.value || "Jose Ramón Fernández de la Cigoña Fraga",
      photoUrl: photo?.value || DEFAULT_PHOTO_URL
    });
  });

  app.post("/api/login", authLimiter, async (req, res) => {
    const { username, password, twoFactorCode } = req.body;
    const adminUser = process.env.ADMIN_USER || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin";
    
    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    const is2faDisabled = !process.env.TWO_FACTOR_ENABLED || String(process.env.TWO_FACTOR_ENABLED).trim().toLowerCase() === 'false';
    
    if (is2faDisabled) {
      req.session.authenticated = true;
      return res.json({ success: true });
    }

    const secretRow = db.prepare("SELECT value FROM settings WHERE key = 'totp_secret'").get() as { value: string } | undefined;
    const verifiedRow = db.prepare("SELECT value FROM settings WHERE key = 'totp_verified'").get() as { value: string } | undefined;

    let secret = secretRow?.value;
    let isVerified = verifiedRow?.value === 'true';

    if (!secret) {
      secret = generateSecret();
      db.prepare("INSERT INTO settings (key, value) VALUES ('totp_secret', ?)").run(secret);
      db.prepare("INSERT INTO settings (key, value) VALUES ('totp_verified', 'false')").run();
      isVerified = false;
    }

    if (!twoFactorCode) {
      if (!isVerified) {
        const otpauth = generateURI({
          issuer: 'EscritorioContable',
          label: username,
          secret
        });
        const qrCodeUrl = await QRCode.toDataURL(otpauth);
        return res.json({ require2FASetup: true, qrCode: qrCodeUrl });
      } else {
        return res.json({ require2FA: true });
      }
    }

    const result = await verify({ token: twoFactorCode, secret });

    if (result.valid) {
      if (!isVerified) {
        db.prepare("UPDATE settings SET value = 'true' WHERE key = 'totp_verified'").run();
      }
      req.session.authenticated = true;
      return res.json({ success: true });
    } else {
      return res.status(401).json({ error: "Código 2FA inválido" });
    }
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        res.status(500).json({ error: "Error al cerrar sesión" });
      } else {
        res.json({ success: true });
      }
    });
  });

  app.get("/api/check-auth", (req, res) => {
    res.json({ authenticated: !!req.session.authenticated });
  });

  // UPDATED POST endpoint with slug validation and new fields
  app.post("/api/posts", requireAuth, apiLimiter, (req, res) => {
    const { title, content, category, slug, seoKeywords, readingTime, metaDescription, imageUrl } = req.body;
    
    // Slug validation rules
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({ error: "El slug solo puede contener letras minúsculas, números y guiones, sin espacios." });
    }

    // Check unique slug
    const existing = db.prepare("SELECT id FROM posts WHERE slug = ?").get(slug);
    if (existing) {
      return res.status(400).json({ error: "slug already exists" });
    }

    try {
      const stmt = db.prepare("INSERT INTO posts (title, content, category, slug, seoKeywords, readingTime, metaDescription, views, imageUrl) VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?)");
      const info = stmt.run(title, content, category, slug, seoKeywords, readingTime, metaDescription || "", imageUrl || null);
      res.json({ id: info.lastInsertRowid, slug });
    } catch (error) {
      res.status(500).json({ error: "Error interno al crear el artículo" });
    }
  });

  // NEW ENDPOINT: Edit post
  app.put("/api/posts/:id", requireAuth, apiLimiter, (req, res) => {
    const { id } = req.params;
    const { title, content, category, slug, seoKeywords, readingTime, metaDescription, imageUrl } = req.body;
    
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(slug)) {
      return res.status(400).json({ error: "El slug solo puede contener letras minúsculas, números y guiones, sin espacios." });
    }

    const existing = db.prepare("SELECT id FROM posts WHERE slug = ? AND id != ?").get(slug, Number(id));
    if (existing) {
      return res.status(400).json({ error: "El slug ya está en uso por otro artículo." });
    }

    try {
      const stmt = db.prepare("UPDATE posts SET title = ?, content = ?, category = ?, slug = ?, seoKeywords = ?, readingTime = ?, metaDescription = ?, imageUrl = ? WHERE id = ?");
      const result = stmt.run(title, content, category, slug, seoKeywords, readingTime, metaDescription || "", imageUrl || null, Number(id));
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Artículo no encontrado" });
      }
      
      res.json({ success: true, slug });
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ error: "Error interno al actualizar el artículo" });
    }
  });

  app.delete("/api/posts/:id", requireAuth, apiLimiter, (req, res) => {
    const { id } = req.params;
    try {
      const result = db.prepare("DELETE FROM posts WHERE id = ?").run(Number(id));
      console.log(`Deleted post ${id}, changes: ${result.changes}`);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting post ${id}:`, error);
      res.status(500).json({ error: "Error al eliminar el artículo" });
    }
  });

  // NEW ENDPOINT: Upload images for markdown editor
  app.post("/api/upload", requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ninguna imagen" });
    }
    
    // Return the URL where the image can be accessed
    const imageUrl = `/uploads/${req.file.filename}`;
    res.json({ url: imageUrl });
  });

  app.get("/api/experience", apiLimiter, (req, res) => {
    const exp = db.prepare("SELECT * FROM experience ORDER BY id DESC").all();
    res.json(exp);
  });

  // NEW ENDPOINTS: Manage profile and experience
  app.post("/api/experience", requireAuth, apiLimiter, (req, res) => {
    const { company, role, period, description } = req.body;
    try {
      const stmt = db.prepare("INSERT INTO experience (company, role, period, description) VALUES (?, ?, ?, ?)");
      const info = stmt.run(company, role, period, description || "");
      res.json({ id: info.lastInsertRowid });
    } catch (error) {
      res.status(500).json({ error: "Error interno al crear experiencia" });
    }
  });

  app.put("/api/experience/:id", requireAuth, apiLimiter, (req, res) => {
    const { id } = req.params;
    const { company, role, period, description } = req.body;
    try {
      const stmt = db.prepare("UPDATE experience SET company = ?, role = ?, period = ?, description = ? WHERE id = ?");
      const result = stmt.run(company, role, period, description || "", Number(id));
      
      if (result.changes === 0) {
        return res.status(404).json({ error: "Experiencia no encontrada" });
      }
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error updating experience:", error);
      res.status(500).json({ error: "Error interno al actualizar experiencia" });
    }
  });

  app.delete("/api/experience/:id", requireAuth, apiLimiter, (req, res) => {
    const { id } = req.params;
    try {
      const result = db.prepare("DELETE FROM experience WHERE id = ?").run(Number(id));
      console.log(`Deleted experience ${id}, changes: ${result.changes}`);
      res.json({ success: true });
    } catch (error) {
      console.error(`Error deleting experience ${id}:`, error);
      res.status(500).json({ error: "Error al eliminar experiencia" });
    }
  });

  app.post("/api/author", requireAuth, apiLimiter, (req, res) => {
    const { photoUrl, name } = req.body;
    try {
      if (photoUrl) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("author_photo", photoUrl);
      if (name) db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("author_name", name);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error interno al actualizar perfil" });
    }
  });

  app.post("/api/admin/reset-2fa", requireAuth, apiLimiter, (req, res) => {
    try {
      db.prepare("DELETE FROM settings WHERE key = 'totp_secret'").run();
      db.prepare("DELETE FROM settings WHERE key = 'totp_verified'").run();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Error al resetear 2FA" });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
