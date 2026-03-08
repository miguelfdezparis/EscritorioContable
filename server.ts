import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import rateLimit from "express-rate-limit";
import session from "express-session";
import { generateSecret, verify, generateURI } from "otplib";
import QRCode from "qrcode";

declare module "express-session" {
  interface SessionData {
    authenticated: boolean;
  }
}

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("blog.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS posts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT NOT NULL,
    date DATETIME DEFAULT CURRENT_TIMESTAMP
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

// Migrate old categories
db.exec(`
  UPDATE posts SET category = 'Financiero' WHERE category = 'Finanzas';
  UPDATE posts SET category = 'Contable' WHERE category = 'Contabilidad';
`);

// Rate limiters
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: { error: "Demasiadas peticiones desde esta IP, por favor inténtalo de nuevo más tarde." }
});

const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // Limit each IP to 10 login attempts per hour
  message: { error: "Demasiados intentos de inicio de sesión, por favor inténtalo de nuevo en una hora." }
});

const DEFAULT_PHOTO_URL = "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800";

async function seedDatabase() {
  const expCount = db.prepare("SELECT COUNT(*) as count FROM experience").get() as { count: number };
  if (expCount.count > 0) return;

  const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
  
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY" || apiKey.length < 10) {
    console.warn("Seeding: No valid GEMINI_API_KEY found. Using fallback experience data.");
    insertFallbackExperience();
    insertFallbackPosts();
    return;
  }

  console.log("Seeding database with author info using Gemini...");
  const ai = new GoogleGenAI({ apiKey });

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "Genera un JSON con la experiencia profesional de Jose Ramón Fernández de la Cigoña Fraga (LinkedIn: https://www.linkedin.com/in/josefcfraga/). El JSON debe ser un array de objetos con las propiedades: company, role, period, description. Incluye al menos 3 experiencias relevantes encontradas en su perfil profesional. También busca una URL de su foto de perfil profesional si es posible y devuélvela en un campo 'photoUrl'.",
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
      },
    });

    const data = JSON.parse(response.text);
    const experience = data.experience || data;
    const photoUrl = data.photoUrl || DEFAULT_PHOTO_URL;

    if (photoUrl) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run("author_photo", photoUrl);
    }

    const insertExp = db.prepare("INSERT INTO experience (company, role, period, description) VALUES (?, ?, ?, ?)");
    for (const exp of Array.isArray(experience) ? experience : []) {
      insertExp.run(exp.company, exp.role, exp.period, exp.description);
    }
    insertFallbackPosts();
    console.log("Database seeded successfully via Gemini!");
  } catch (error) {
    console.error("Error seeding database via Gemini (using fallback):", error);
    insertFallbackExperience();
    insertFallbackPosts();
  }
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

  const insertPost = db.prepare("INSERT INTO posts (title, content, category) VALUES (?, ?, ?)");
  insertPost.run(
    "La importancia de la contabilidad analítica en la PYME",
    "La contabilidad analítica es una herramienta fundamental para la gestión interna. Permite conocer el coste real de cada producto o servicio y tomar decisiones basadas en datos precisos.",
    "Contable"
  );
  insertPost.run(
    "Novedades en la cotización de autónomos para 2024",
    "El nuevo sistema basado en ingresos reales introduce cambios significativos en las cuotas mensuales. Es fundamental planificar los rendimientos netos para evitar regularizaciones inesperadas.",
    "Laboral"
  );
  insertPost.run(
    "Análisis de ratios financieros para el control de gestión",
    "Los ratios de liquidez y solvencia son vitales para asegurar la continuidad del negocio. Un análisis periódico permite detectar tensiones de tesorería antes de que sean críticas.",
    "Financiero"
  );
}

async function startServer() {
  // Run seeding in background to not block server startup
  seedDatabase().catch(err => console.error("Background seeding failed:", err));
  
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || "jose-ramon-secret-key-2024",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 1 day
      sameSite: "lax"
    }
  }));

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (req.session.authenticated) {
      next();
    } else {
      res.status(401).json({ error: "No autorizado" });
    }
  };

  // API Routes
  app.get("/api/posts", apiLimiter, (req, res) => {
    const posts = db.prepare("SELECT * FROM posts ORDER BY date DESC").all();
    res.json(posts);
  });

  app.get("/api/author", apiLimiter, (req, res) => {
    const photo = db.prepare("SELECT value FROM settings WHERE key = ?").get("author_photo") as { value: string } | undefined;
    res.json({ 
      name: "Jose Ramón Fernández de la Cigoña Fraga",
      photoUrl: photo?.value || DEFAULT_PHOTO_URL
    });
  });

  app.post("/api/login", authLimiter, async (req, res) => {
    const { username, password, twoFactorCode } = req.body;
    const adminUser = process.env.ADMIN_USER || "admin";
    const adminPass = process.env.ADMIN_PASSWORD || "admin123";
    
    if (username !== adminUser || password !== adminPass) {
      return res.status(401).json({ error: "Credenciales incorrectas" });
    }

    // Check if 2FA is set up
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
          issuer: 'CEF_JoseRamon',
          label: username,
          secret
        });
        const qrCodeUrl = await QRCode.toDataURL(otpauth);
        return res.json({ require2FASetup: true, qrCode: qrCodeUrl });
      } else {
        return res.json({ require2FA: true });
      }
    }

    // Verify code
    const isValid = await verify({ token: twoFactorCode, secret });

    if (isValid) {
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

  app.post("/api/posts", requireAuth, apiLimiter, (req, res) => {
    const { title, content, category } = req.body;
    const stmt = db.prepare("INSERT INTO posts (title, content, category) VALUES (?, ?, ?)");
    const info = stmt.run(title, content, category);
    res.json({ id: info.lastInsertRowid });
  });

  app.delete("/api/posts/:id", requireAuth, apiLimiter, (req, res) => {
    const { id } = req.params;
    db.prepare("DELETE FROM posts WHERE id = ?").run(id);
    res.json({ success: true });
  });

  app.get("/api/experience", apiLimiter, (req, res) => {
    const exp = db.prepare("SELECT * FROM experience ORDER BY id DESC").all();
    res.json(exp);
  });

  // Vite middleware for development
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
