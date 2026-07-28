const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDir = path.resolve(__dirname, "../../uploads/produtos");
fs.mkdirSync(uploadsDir, { recursive: true });

const permitidos = new Map([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"], [".webp", "image/webp"],
  [".mp4", "video/mp4"], [".mov", "video/quicktime"], [".webm", "video/webm"],
]);

function nomeSeguro(original) {
  const ext = path.extname(original || "").toLowerCase();
  const base = path.basename(original || "arquivo", ext).normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 70) || "arquivo";
  return `${base}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => cb(null, nomeSeguro(file.originalname)),
});

const uploadProdutos = multer({
  storage,
  limits: { files: 12, fileSize: 80 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(permitidos.get(ext) === file.mimetype ? null : Object.assign(new Error("Esse tipo de arquivo não é aceito. Use JPG, PNG, WEBP, MP4, MOV ou WEBM."), { statusCode: 400 }), permitidos.get(ext) === file.mimetype);
  },
}).array("arquivos", 12);

function middlewareUploadProdutos(req, res, next) {
  uploadProdutos(req, res, error => {
    if (!error) return next();
    (req.files || []).forEach(file => fs.promises.unlink(file.path).catch(() => {}));
    const message = error.code === "LIMIT_FILE_SIZE" ? "O arquivo excede o limite de 80 MB." : error.code === "LIMIT_FILE_COUNT" ? "Selecione no máximo 12 arquivos." : error.message;
    res.status(error.statusCode || 400).json({ message });
  });
}

module.exports = { middlewareUploadProdutos, uploadsDir };
