const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDir = path.resolve(__dirname, "../../uploads/carrossel");
fs.mkdirSync(uploadsDir, { recursive: true });

const tiposPermitidos = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

function nomeSeguro(original) {
  const ext = path.extname(original || "").toLowerCase();
  const base = path.basename(original || "carrossel", ext).normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "").slice(0, 60) || "carrossel";
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, nomeSeguro(file.originalname)),
  }),
  limits: { files: 3, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const valido = tiposPermitidos.get(ext) === file.mimetype;
    cb(valido ? null : Object.assign(new Error("Use imagens JPG, PNG ou WEBP."), { statusCode: 400 }), valido);
  },
}).array("imagens", 3);

function middlewareUploadCarrossel(req, res, next) {
  upload(req, res, error => {
    if (!error) return next();
    (req.files || []).forEach(file => fs.promises.unlink(file.path).catch(() => {}));
    const message = error.code === "LIMIT_FILE_SIZE"
      ? "Cada imagem pode ter no máximo 10 MB."
      : error.code === "LIMIT_FILE_COUNT" ? "Selecione no máximo 3 imagens." : error.message;
    return res.status(error.statusCode || 400).json({ message });
  });
}

module.exports = { middlewareUploadCarrossel, uploadsDir };
