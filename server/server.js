const express = require("express");
const crypto = require("crypto");
const multer = require("multer");
const path = require("path");
const db = require("./db");
const storage = require("./storage");

const app = express();
const PORT = process.env.PORT || 3000;
const ROOT = path.join(__dirname, "..");
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "wedding2026";
const SESSION_MS = 8 * 60 * 60 * 1000;

const sessions = new Map();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    if (storage.IMAGE_EXT.test(file.originalname)) {
      cb(null, true);
      return;
    }
    cb(new Error("이미지 파일만 업로드할 수 있습니다."));
  }
});

app.use(express.json({ limit: "3mb" }));
app.use(express.static(ROOT));

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return y + "-" + m + "-" + d;
}

function requireAdmin(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.indexOf("Bearer ") === 0 ? header.slice(7) : "";

  if (!token || !sessions.has(token)) {
    return res.status(401).json({ message: "관리자 인증이 필요합니다." });
  }

  const session = sessions.get(token);
  if (Date.now() > session.expiresAt) {
    sessions.delete(token);
    return res.status(401).json({ message: "세션이 만료되었습니다." });
  }

  req.adminToken = token;
  next();
}

function handleAsync(handler) {
  return function (req, res) {
    Promise.resolve(handler(req, res)).catch(function (error) {
      console.error(error);
      res.status(500).json({ message: error.message || "서버 오류가 발생했습니다." });
    });
  };
}

app.get("/api/health", handleAsync(async function (req, res) {
  const dbStatus = await db.pingDatabase();
  res.json({
    ok: true,
    db: dbStatus.mode,
    storage: storage.getStorageMode()
  });
}));

app.post("/api/admin/login", function (req, res) {
  const password = String(req.body.password || "");

  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ message: "비밀번호가 올바르지 않습니다." });
  }

  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { expiresAt: Date.now() + SESSION_MS });

  res.json({
    token: token,
    expiresAt: sessions.get(token).expiresAt
  });
});

app.post("/api/admin/logout", requireAdmin, function (req, res) {
  sessions.delete(req.adminToken);
  res.json({ ok: true });
});

app.get("/api/admin/media", requireAdmin, handleAsync(async function (req, res) {
  const folder = String(req.query.folder || "all");
  res.json(await storage.listMedia(folder));
}));

app.post("/api/admin/media/upload", requireAdmin, function (req, res) {
  upload.single("file")(req, res, function (error) {
    if (error) {
      return res.status(400).json({ message: error.message || "업로드에 실패했습니다." });
    }

    storage.uploadImage(req.file)
      .then(function (file) {
        res.status(201).json(file);
      })
      .catch(function (uploadError) {
        res.status(500).json({ message: uploadError.message || "업로드에 실패했습니다." });
      });
  });
});

app.get("/api/posts", handleAsync(async function (req, res) {
  res.json(await db.listPostsPublic());
}));

app.get("/api/posts/:id", handleAsync(async function (req, res) {
  const post = await db.getPost(req.params.id);
  if (!post) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }
  res.json(post);
}));

app.get("/api/admin/posts", requireAdmin, handleAsync(async function (req, res) {
  res.json(await db.listPostsAdmin());
}));

app.post("/api/admin/posts", requireAdmin, handleAsync(async function (req, res) {
  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();
  const createdAt = String(req.body.createdAt || formatDate(new Date())).trim();

  if (!title || !content) {
    return res.status(400).json({ message: "제목과 내용을 입력해 주세요." });
  }

  const post = await db.createPost({
    title: title,
    content: content,
    imageUrl: String(req.body.imageUrl || "").trim(),
    youtubeUrl: String(req.body.youtubeUrl || "").trim(),
    createdAt: createdAt,
    isNotice: Boolean(req.body.isNotice)
  });

  res.status(201).json(post);
}));

app.put("/api/admin/posts/:id", requireAdmin, handleAsync(async function (req, res) {
  const title = String(req.body.title || "").trim();
  const content = String(req.body.content || "").trim();
  const createdAt = String(req.body.createdAt || formatDate(new Date())).trim();

  if (!title || !content) {
    return res.status(400).json({ message: "제목과 내용을 입력해 주세요." });
  }

  const post = await db.updatePost(req.params.id, {
    title: title,
    content: content,
    imageUrl: String(req.body.imageUrl || "").trim(),
    youtubeUrl: String(req.body.youtubeUrl || "").trim(),
    createdAt: createdAt,
    isNotice: Boolean(req.body.isNotice)
  });

  if (!post) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }

  res.json(post);
}));

app.delete("/api/admin/posts/:id", requireAdmin, handleAsync(async function (req, res) {
  const deleted = await db.deletePost(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "게시글을 찾을 수 없습니다." });
  }
  res.json({ ok: true });
}));

app.get("/api/popups/active", handleAsync(async function (req, res) {
  const popup = await db.getActivePopup(formatDate(new Date()));
  res.json(popup || null);
}));

app.get("/api/admin/popups", requireAdmin, handleAsync(async function (req, res) {
  res.json(await db.listPopupsAdmin());
}));

app.post("/api/admin/popups", requireAdmin, handleAsync(async function (req, res) {
  const imageUrl = String(req.body.imageUrl || "").trim();
  const linkUrl = String(req.body.linkUrl || "").trim();

  if (!imageUrl) {
    return res.status(400).json({ message: "팝업 이미지를 선택해 주세요." });
  }

  const popup = await db.createPopup({
    imageUrl: imageUrl,
    linkUrl: linkUrl,
    active: Boolean(req.body.active),
    startDate: String(req.body.startDate || "").trim(),
    endDate: String(req.body.endDate || "").trim()
  });

  res.status(201).json(popup);
}));

app.put("/api/admin/popups/:id", requireAdmin, handleAsync(async function (req, res) {
  const imageUrl = String(req.body.imageUrl || "").trim();
  const linkUrl = String(req.body.linkUrl || "").trim();

  if (!imageUrl) {
    return res.status(400).json({ message: "팝업 이미지를 선택해 주세요." });
  }

  const popup = await db.updatePopup(req.params.id, {
    imageUrl: imageUrl,
    linkUrl: linkUrl,
    active: Boolean(req.body.active),
    startDate: String(req.body.startDate || "").trim(),
    endDate: String(req.body.endDate || "").trim()
  });

  if (!popup) {
    return res.status(404).json({ message: "팝업을 찾을 수 없습니다." });
  }

  res.json(popup);
}));

app.delete("/api/admin/popups/:id", requireAdmin, handleAsync(async function (req, res) {
  const deleted = await db.deletePopup(req.params.id);
  if (!deleted) {
    return res.status(404).json({ message: "팝업을 찾을 수 없습니다." });
  }
  res.json({ ok: true });
}));

async function start() {
  storage.initStorage();
  await db.initDatabase();

  app.listen(PORT, function () {
    console.log("2026 서울 결혼페스타 서버: http://localhost:" + PORT);
    console.log("관리자 페이지: http://localhost:" + PORT + "/admin/");
    console.log("DB:", db.isUsingJson() ? "JSON (local)" : "PostgreSQL");
    console.log("Storage:", storage.getStorageMode());
  });
}

start().catch(function (error) {
  console.error("서버 시작 실패:", error);
  process.exit(1);
});
