const fs = require("fs");
const path = require("path");
const { Pool } = require("pg");

const DATA_DIR = path.join(__dirname, "data");
const POSTS_SEED = path.join(DATA_DIR, "posts.json");
const POPUPS_SEED = path.join(DATA_DIR, "popups.json");

let pool = null;
let useJson = false;

function readSeed(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    return [];
  }
}

function writeJsonSeed(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function mapPostRow(row) {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    imageUrl: row.image_url || "",
    youtubeUrl: row.youtube_url || "",
    createdAt: row.created_at
  };
}

function mapPopupRow(row) {
  return {
    id: row.id,
    imageUrl: row.image_url || "",
    linkUrl: row.link_url || "",
    active: Boolean(row.active),
    startDate: row.start_date || "",
    endDate: row.end_date || ""
  };
}

async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    useJson = true;
    console.log("[db] DATABASE_URL 없음 — JSON 파일 모드 (로컬 개발)");
    return;
  }

  pool = new Pool({
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false
  });

  await pool.query(`
    CREATE TABLE IF NOT EXISTS posts (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      image_url TEXT NOT NULL DEFAULT '',
      youtube_url TEXT NOT NULL DEFAULT '',
      created_at DATE NOT NULL
    )
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS popups (
      id SERIAL PRIMARY KEY,
      image_url TEXT NOT NULL,
      link_url TEXT NOT NULL DEFAULT '',
      active BOOLEAN NOT NULL DEFAULT TRUE,
      start_date DATE,
      end_date DATE
    )
  `);

  const countResult = await pool.query("SELECT COUNT(*)::int AS count FROM posts");
  if (countResult.rows[0].count === 0) {
    await seedFromJsonFiles();
  }

  console.log("[db] PostgreSQL 연결 완료");
}

async function seedFromJsonFiles() {
  const posts = readSeed(POSTS_SEED);
  const popups = readSeed(POPUPS_SEED);

  for (const post of posts) {
    await pool.query(
      `INSERT INTO posts (id, title, content, image_url, youtube_url, created_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        post.id,
        post.title,
        post.content,
        post.imageUrl || "",
        post.youtubeUrl || "",
        post.createdAt
      ]
    );
  }

  if (posts.length) {
    await pool.query("SELECT setval('posts_id_seq', (SELECT MAX(id) FROM posts))");
  }

  for (const popup of popups) {
    await pool.query(
      `INSERT INTO popups (id, image_url, link_url, active, start_date, end_date)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        popup.id,
        popup.imageUrl,
        popup.linkUrl || "",
        Boolean(popup.active),
        popup.startDate || null,
        popup.endDate || null
      ]
    );
  }

  if (popups.length) {
    await pool.query("SELECT setval('popups_id_seq', (SELECT MAX(id) FROM popups))");
  }

  console.log("[db] 초기 데이터 시드 완료");
}

function isUsingJson() {
  return useJson;
}

async function listPostsPublic() {
  if (useJson) {
    const posts = readSeed(POSTS_SEED).sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return posts.map(function (post) {
      return { id: post.id, title: post.title, createdAt: post.createdAt };
    });
  }

  const result = await pool.query(
    "SELECT id, title, created_at FROM posts ORDER BY created_at DESC, id DESC"
  );
  return result.rows.map(function (row) {
    return { id: row.id, title: row.title, createdAt: row.created_at };
  });
}

async function getPost(id) {
  if (useJson) {
    return readSeed(POSTS_SEED).find(function (item) {
      return String(item.id) === String(id);
    }) || null;
  }

  const result = await pool.query("SELECT * FROM posts WHERE id = $1", [id]);
  return result.rows[0] ? mapPostRow(result.rows[0]) : null;
}

async function listPostsAdmin() {
  if (useJson) {
    return readSeed(POSTS_SEED).sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
  }

  const result = await pool.query("SELECT * FROM posts ORDER BY created_at DESC, id DESC");
  return result.rows.map(mapPostRow);
}

async function createPost(data) {
  if (useJson) {
    const posts = readSeed(POSTS_SEED);
    const post = {
      id: posts.length ? Math.max.apply(null, posts.map(function (p) { return Number(p.id); })) + 1 : 1,
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      youtubeUrl: data.youtubeUrl,
      createdAt: data.createdAt
    };
    posts.unshift(post);
    writeJsonSeed(POSTS_SEED, posts);
    return post;
  }

  const result = await pool.query(
    `INSERT INTO posts (title, content, image_url, youtube_url, created_at)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [data.title, data.content, data.imageUrl, data.youtubeUrl, data.createdAt]
  );
  return mapPostRow(result.rows[0]);
}

async function updatePost(id, data) {
  if (useJson) {
    const posts = readSeed(POSTS_SEED);
    const index = posts.findIndex(function (item) {
      return String(item.id) === String(id);
    });
    if (index === -1) return null;
    posts[index] = {
      id: posts[index].id,
      title: data.title,
      content: data.content,
      imageUrl: data.imageUrl,
      youtubeUrl: data.youtubeUrl,
      createdAt: data.createdAt
    };
    writeJsonSeed(POSTS_SEED, posts);
    return posts[index];
  }

  const result = await pool.query(
    `UPDATE posts
     SET title = $2, content = $3, image_url = $4, youtube_url = $5, created_at = $6
     WHERE id = $1
     RETURNING *`,
    [id, data.title, data.content, data.imageUrl, data.youtubeUrl, data.createdAt]
  );
  return result.rows[0] ? mapPostRow(result.rows[0]) : null;
}

async function deletePost(id) {
  if (useJson) {
    const posts = readSeed(POSTS_SEED);
    const nextPosts = posts.filter(function (item) {
      return String(item.id) !== String(id);
    });
    if (nextPosts.length === posts.length) return false;
    writeJsonSeed(POSTS_SEED, nextPosts);
    return true;
  }

  const result = await pool.query("DELETE FROM posts WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function getActivePopup(today) {
  if (useJson) {
    return readSeed(POPUPS_SEED).find(function (popup) {
      if (!popup.active || !popup.imageUrl) return false;
      if (popup.startDate && today < popup.startDate) return false;
      if (popup.endDate && today > popup.endDate) return false;
      return true;
    }) || null;
  }

  const result = await pool.query(
    `SELECT * FROM popups
     WHERE active = TRUE
       AND image_url <> ''
       AND (start_date IS NULL OR start_date <= $1)
       AND (end_date IS NULL OR end_date >= $1)
     ORDER BY id DESC
     LIMIT 1`,
    [today]
  );
  return result.rows[0] ? mapPopupRow(result.rows[0]) : null;
}

async function listPopupsAdmin() {
  if (useJson) {
    return readSeed(POPUPS_SEED).sort(function (a, b) {
      return Number(b.id) - Number(a.id);
    });
  }

  const result = await pool.query("SELECT * FROM popups ORDER BY id DESC");
  return result.rows.map(mapPopupRow);
}

async function createPopup(data) {
  if (useJson) {
    const popups = readSeed(POPUPS_SEED);
    const popup = {
      id: popups.length ? Math.max.apply(null, popups.map(function (p) { return Number(p.id); })) + 1 : 1,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      active: data.active,
      startDate: data.startDate,
      endDate: data.endDate
    };
    popups.unshift(popup);
    writeJsonSeed(POPUPS_SEED, popups);
    return popup;
  }

  const result = await pool.query(
    `INSERT INTO popups (image_url, link_url, active, start_date, end_date)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [
      data.imageUrl,
      data.linkUrl,
      data.active,
      data.startDate || null,
      data.endDate || null
    ]
  );
  return mapPopupRow(result.rows[0]);
}

async function updatePopup(id, data) {
  if (useJson) {
    const popups = readSeed(POPUPS_SEED);
    const index = popups.findIndex(function (item) {
      return String(item.id) === String(id);
    });
    if (index === -1) return null;
    popups[index] = {
      id: popups[index].id,
      imageUrl: data.imageUrl,
      linkUrl: data.linkUrl,
      active: data.active,
      startDate: data.startDate,
      endDate: data.endDate
    };
    writeJsonSeed(POPUPS_SEED, popups);
    return popups[index];
  }

  const result = await pool.query(
    `UPDATE popups
     SET image_url = $2, link_url = $3, active = $4, start_date = $5, end_date = $6
     WHERE id = $1
     RETURNING *`,
    [
      id,
      data.imageUrl,
      data.linkUrl,
      data.active,
      data.startDate || null,
      data.endDate || null
    ]
  );
  return result.rows[0] ? mapPopupRow(result.rows[0]) : null;
}

async function deletePopup(id) {
  if (useJson) {
    const popups = readSeed(POPUPS_SEED);
    const nextPopups = popups.filter(function (item) {
      return String(item.id) !== String(id);
    });
    if (nextPopups.length === popups.length) return false;
    writeJsonSeed(POPUPS_SEED, nextPopups);
    return true;
  }

  const result = await pool.query("DELETE FROM popups WHERE id = $1", [id]);
  return result.rowCount > 0;
}

async function pingDatabase() {
  if (useJson) return { ok: true, mode: "json" };
  await pool.query("SELECT 1");
  return { ok: true, mode: "postgres" };
}

module.exports = {
  initDatabase,
  isUsingJson,
  listPostsPublic,
  getPost,
  listPostsAdmin,
  createPost,
  updatePost,
  deletePost,
  getActivePopup,
  listPopupsAdmin,
  createPopup,
  updatePopup,
  deletePopup,
  pingDatabase
};
