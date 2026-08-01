const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDir = path.resolve(__dirname, "../../uploads/informativos");
fs.mkdirSync(uploadsDir, { recursive: true });

const tiposPermitidos = new Map([
  [".jpg", "image/jpeg"], [".jpeg", "image/jpeg"], [".png", "image/png"], [".webp", "image/webp"],
]);

function nomeSeguro(original) {
  const ext = path.extname(original || "").toLowerCase();
  return `informativo-${Date.now()}-${Math.random().toString(36).slice(2, 9)}${ext}`;
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsDir),
    filename: (_req, file, cb) => cb(null, nomeSeguro(file.originalname)),
  }),
  limits: { files: 1, fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const valido = tiposPermitidos.get(ext) === file.mimetype;
    cb(valido ? null : Object.assign(new Error("Use uma imagem JPG, PNG ou WEBP."), { statusCode: 400 }), valido);
  },
}).single("imagem");

function middlewareUploadInformativo(req, res, next) {
  upload(req, res, error => {
    if (!error) return next();
    if (req.file?.path) fs.promises.unlink(req.file.path).catch(() => {});
    const message = error.code === "LIMIT_FILE_SIZE" ? "A imagem pode ter no máximo 10 MB." : error.message;
    return res.status(error.statusCode || 400).json({ message });
  });
}

module.exports = { middlewareUploadInformativo, uploadsDir };
