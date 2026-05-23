import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import { createServer as createViteServer } from "vite";

const app = express();
const PORT = 3000;

// Set up paths relative to process.cwd() to support both dev & production build locations
// If running in Vercel (where workspace is read-only), write dynamically to /tmp
const isVercel = !!process.env.VERCEL;
const uploadDir = isVercel ? "/tmp/uploads" : path.join(process.cwd(), "uploads");
const dataDir = isVercel ? "/tmp/data" : path.join(process.cwd(), "data");
const certificatesFile = path.join(dataDir, "certificates.json");

// Ensure directories and storage files exist
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}
if (!fs.existsSync(certificatesFile)) {
  const repoCertsFile = path.join(process.cwd(), "data", "certificates.json");
  const repoUploadsDir = path.join(process.cwd(), "uploads");
  
  if (isVercel && fs.existsSync(repoCertsFile)) {
    try {
      fs.copyFileSync(repoCertsFile, certificatesFile);
      if (fs.existsSync(repoUploadsDir)) {
        const files = fs.readdirSync(repoUploadsDir);
        for (const file of files) {
          const srcFile = path.join(repoUploadsDir, file);
          const destFile = path.join(uploadDir, file);
          if (fs.statSync(srcFile).isFile() && !fs.existsSync(destFile)) {
            fs.copyFileSync(srcFile, destFile);
          }
        }
      }
    } catch (e) {
      console.warn("Could not copy initial seed to Vercel temporal space:", e);
      fs.writeFileSync(certificatesFile, JSON.stringify([], null, 2));
    }
  } else {
    fs.writeFileSync(certificatesFile, JSON.stringify([], null, 2));
  }
}

// Set up multer for PDF file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate a clean filename: timestamp-originalName
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, "_");
    cb(null, `${Date.now()}-${safeName}`);
  }
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") {
      return cb(new Error("Solo se permiten archivos PDF."));
    }
    cb(null, true);
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Middleware for parsing JSON and form bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded PDFs as a static folder
app.use("/uploads", express.static(uploadDir));

// Helpers for reading/writing certified lists
interface Certificate {
  id: string;
  certificateNumber: string;
  country: string;
  pdfFilename: string;
  pdfOriginalName: string;
  createdAt: string;
}

function getCertificates(): Certificate[] {
  try {
    const data = fs.readFileSync(certificatesFile, "utf-8");
    return JSON.parse(data) as Certificate[];
  } catch (error) {
    return [];
  }
}

function saveCertificates(certs: Certificate[]) {
  fs.writeFileSync(certificatesFile, JSON.stringify(certs, null, 2), "utf-8");
}

// -------------------------------------------------------------
// API Endpoints
// -------------------------------------------------------------

// Verification check (Public endpoint used by "Consultar" button)
app.get("/api/verify", (req, res) => {
  const { certificateNumber, country } = req.query;
  if (!certificateNumber || !country) {
    return res.status(400).json({ error: "Faltan parámetros requeridos" });
  }

  const certs = getCertificates();
  // Case-insensitive & trimmed comparison
  const normCertNumber = String(certificateNumber).trim().toLowerCase();
  const normCountry = String(country).trim().toLowerCase();

  const found = certs.find(c => 
    c.certificateNumber.trim().toLowerCase() === normCertNumber &&
    c.country.trim().toLowerCase() === normCountry
  );

  if (found) {
    return res.json({ verified: true, certificate: found });
  } else {
    return res.json({ verified: false, message: "Certificado o Informe no encontrado." });
  }
});

// Simple token authentication middleware for administrative actions
const ADMIN_TOKEN = "equifax-admin-token-2026";
function checkAdminAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader === `Bearer ${ADMIN_TOKEN}`) {
    next();
  } else {
    res.status(401).json({ error: "No autorizado. Sesión de administrador inválida." });
  }
}

// Admin login endpoint
app.post("/api/admin/login", (req, res) => {
  const { username, password } = req.body;
  if (username === "Equifax" && password === "Equifax2026@") {
    return res.json({ success: true, token: ADMIN_TOKEN });
  }
  return res.status(401).json({ success: false, error: "Usuario o contraseña incorrectos." });
});

// List all certificates (Admin only)
app.get("/api/admin/certificates", checkAdminAuth, (req, res) => {
  res.json(getCertificates());
});

// Create certificate (Admin only) - Accepts file upload + certificate info
app.post("/api/admin/certificates", checkAdminAuth, upload.single("pdf"), (req, res) => {
  try {
    const { certificateNumber, country } = req.body;
    if (!certificateNumber || !country) {
      return res.status(400).json({ error: "El número de certificado y el país son obligatorios." });
    }

    if (!req.file) {
      return res.status(400).json({ error: "Debe subir un archivo PDF para el certificado." });
    }

    const certs = getCertificates();

    // Avoid exact duplicates
    const duplicated = certs.some(c => 
      c.certificateNumber.toLowerCase() === certificateNumber.toLowerCase() &&
      c.country.toLowerCase() === country.toLowerCase()
    );

    if (duplicated) {
      // Cleanup uploaded file since design rejected duplicate
      if (req.file.path && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ error: "Ya existe un certificado con este número y país." });
    }

    const newCert: Certificate = {
      id: `cert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      certificateNumber: certificateNumber.trim(),
      country: country.trim(),
      pdfFilename: req.file.filename,
      pdfOriginalName: req.file.originalname,
      createdAt: new Date().toISOString()
    };

    certs.push(newCert);
    saveCertificates(certs);

    res.status(210).json({ success: true, certificate: newCert });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al procesar el certificado." });
  }
});

// Edit certificate (Admin only) - Allows modifying fields & optional PDF replacement
app.put("/api/admin/certificates/:id", checkAdminAuth, upload.single("pdf"), (req, res) => {
  try {
    const { id } = req.params;
    const { certificateNumber, country } = req.body;

    const certs = getCertificates();
    const index = certs.findIndex(c => c.id === id);

    if (index === -1) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ error: "Certificado no encontrado." });
    }

    const existingCert = certs[index];
    let oldFilenameToDelete: string | null = null;

    if (req.file) {
      // Mark old file for deletion after successful update
      oldFilenameToDelete = existingCert.pdfFilename;
      existingCert.pdfFilename = req.file.filename;
      existingCert.pdfOriginalName = req.file.originalname;
    }

    if (certificateNumber) {
      existingCert.certificateNumber = certificateNumber.trim();
    }
    if (country) {
      existingCert.country = country.trim();
    }

    certs[index] = existingCert;
    saveCertificates(certs);

    // Delete old file if replaced
    if (oldFilenameToDelete) {
      const oldFilePath = path.join(uploadDir, oldFilenameToDelete);
      if (fs.existsSync(oldFilePath)) {
        fs.unlinkSync(oldFilePath);
      }
    }

    res.json({ success: true, certificate: existingCert });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al actualizar el certificado." });
  }
});

// Delete certificate (Admin only)
app.delete("/api/admin/certificates/:id", checkAdminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const certs = getCertificates();
    const index = certs.findIndex(c => c.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Certificado no encontrado." });
    }

    const [deletedCert] = certs.splice(index, 1);
    saveCertificates(certs);

    // Delete PDF file from disk
    const filePath = path.join(uploadDir, deletedCert.pdfFilename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    res.json({ success: true, message: "Certificado eliminado exitosamente." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Error al eliminar el certificado." });
  }
});

// -------------------------------------------------------------
// Vite Dev Server Integration & Static Production Handler
// -------------------------------------------------------------

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

if (!isVercel) {
  startServer();
}

export default app;
