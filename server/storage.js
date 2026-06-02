const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = path.join(__dirname, "..");
const UPLOADS_DIR = path.join(ROOT, "uploads");
const IMG_DIR = path.join(ROOT, "img");
const IMAGE_EXT = /\.(jpe?g|png|gif|webp|svg)$/i;
const FIREBASE_PREFIX = "wedding/uploads/";

let bucket = null;
let useFirebase = false;

function initStorage() {
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET || "onnme-website.firebasestorage.app";

  if (json) {
    try {
      const admin = require("firebase-admin");
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(JSON.parse(json)),
          storageBucket: storageBucket
        });
      }
      bucket = admin.storage().bucket();
      useFirebase = true;
      console.log("[storage] Firebase Storage 사용:", storageBucket);
    } catch (error) {
      console.error("[storage] Firebase 초기화 실패:", error.message);
    }
  }

  if (!useFirebase) {
    if (!fs.existsSync(UPLOADS_DIR)) {
      fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    }
    console.log("[storage] 로컬 uploads 폴더 사용 (로컬 개발)");
  }
}

function isFirebaseEnabled() {
  return useFirebase;
}

function getStorageMode() {
  return useFirebase ? "firebase" : "local";
}

function listMediaFiles(baseDir, publicPrefix, folderName) {
  const results = [];

  if (!fs.existsSync(baseDir)) {
    return results;
  }

  function walk(currentDir, relativePath) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });

    entries.forEach(function (entry) {
      if (entry.name.startsWith(".")) return;

      const fullPath = path.join(currentDir, entry.name);
      const nextRelative = relativePath ? relativePath + "/" + entry.name : entry.name;

      if (entry.isDirectory()) {
        walk(fullPath, nextRelative);
        return;
      }

      if (!IMAGE_EXT.test(entry.name)) return;

      results.push({
        name: entry.name,
        path: publicPrefix + nextRelative.replace(/\\/g, "/"),
        folder: folderName
      });
    });
  }

  walk(baseDir, "");
  return results;
}

function buildFirebaseDownloadUrl(objectPath, token) {
  const encoded = encodeURIComponent(objectPath);
  return "https://firebasestorage.googleapis.com/v0/b/" + bucket.name + "/o/" + encoded + "?alt=media&token=" + token;
}

async function listFirebaseUploads() {
  if (!bucket) return [];

  const [files] = await bucket.getFiles({ prefix: FIREBASE_PREFIX });
  const results = [];

  for (const file of files) {
    if (file.name.endsWith("/")) continue;

    const [metadata] = await file.getMetadata();
    const token = metadata.metadata && metadata.metadata.firebaseStorageDownloadTokens;
    if (!token) continue;

    results.push({
      name: path.basename(file.name),
      path: buildFirebaseDownloadUrl(file.name, token),
      folder: "uploads"
    });
  }

  results.sort(function (a, b) {
    return a.name.localeCompare(b.name, "ko");
  });

  return results;
}

async function listMedia(folder) {
  let files = [];

  if (folder === "img" || folder === "all") {
    files = files.concat(listMediaFiles(IMG_DIR, "/img/", "img"));
  }

  if (folder === "uploads" || folder === "all") {
    if (useFirebase) {
      files = files.concat(await listFirebaseUploads());
    } else {
      files = files.concat(listMediaFiles(UPLOADS_DIR, "/uploads/", "uploads"));
    }
  }

  if (folder !== "img" && folder !== "uploads" && folder !== "all") {
    return [];
  }

  files.sort(function (a, b) {
    return a.path.localeCompare(b.path, "ko");
  });

  return files;
}

function safeFileName(name) {
  const ext = path.extname(name).toLowerCase();
  const base = path.basename(name, ext).replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 40) || "image";
  return base + "-" + Date.now() + ext;
}

async function uploadImage(file) {
  if (!file) {
    throw new Error("업로드할 파일을 선택해 주세요.");
  }

  if (useFirebase && bucket) {
    const objectPath = FIREBASE_PREFIX + safeFileName(file.originalname);
    const token = crypto.randomUUID();
    const storageFile = bucket.file(objectPath);

    await storageFile.save(file.buffer, {
      metadata: {
        contentType: file.mimetype,
        metadata: {
          firebaseStorageDownloadTokens: token
        }
      }
    });

    return {
      name: path.basename(objectPath),
      path: buildFirebaseDownloadUrl(objectPath, token),
      folder: "uploads"
    };
  }

  const filename = safeFileName(file.originalname);
  const dest = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(dest, file.buffer);

  return {
    name: filename,
    path: "/uploads/" + filename,
    folder: "uploads"
  };
}

module.exports = {
  initStorage,
  isFirebaseEnabled,
  getStorageMode,
  listMedia,
  uploadImage,
  IMAGE_EXT
};
