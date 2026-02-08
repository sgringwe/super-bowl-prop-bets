const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const express = require("express");
const Database = require("better-sqlite3");

const PORT = process.env.PORT || 3000;
const ADMIN_PATH = "/admin-7f3c2d";
const QUESTIONS_COUNT = 19;
const QUESTION_KEYS = Array.from({ length: QUESTIONS_COUNT }, (_, i) => `question_${i + 1}`);

const dataDir = path.join(__dirname, "data");
fs.mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "app.db");
const db = new Database(dbPath);

const questionColumns = QUESTION_KEYS.map((key) => `${key} INTEGER`).join(",\n  ");

db.exec(`
  CREATE TABLE IF NOT EXISTS entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    is_master INTEGER NOT NULL DEFAULT 0,
    ${questionColumns},
    tiebreaker REAL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE INDEX IF NOT EXISTS idx_entries_is_master ON entries(is_master);
`);

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get(ADMIN_PATH, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "admin.html"));
});

const insertEntrySql = `
  INSERT INTO entries (
    entry_id,
    name,
    is_master,
    ${QUESTION_KEYS.join(", ")},
    tiebreaker
  ) VALUES (
    @entry_id,
    @name,
    @is_master,
    ${QUESTION_KEYS.map((key) => `@${key}`).join(", ")},
    @tiebreaker
  )
`;

const insertEntryStmt = db.prepare(insertEntrySql);

const upsertMasterSql = `
  INSERT INTO entries (
    entry_id,
    name,
    is_master,
    ${QUESTION_KEYS.join(", ")},
    tiebreaker
  ) VALUES (
    @entry_id,
    @name,
    1,
    ${QUESTION_KEYS.map((key) => `@${key}`).join(", ")},
    @tiebreaker
  )
  ON CONFLICT(entry_id) DO UPDATE SET
    name = excluded.name,
    is_master = 1,
    ${QUESTION_KEYS.map((key) => `${key} = excluded.${key}`).join(", ")},
    tiebreaker = excluded.tiebreaker
`;

const upsertMasterStmt = db.prepare(upsertMasterSql);

function normalizeAnswers(answers) {
  if (!answers || typeof answers !== "object") {
    return { error: "Answers are required." };
  }

  const normalized = {};
  for (const key of QUESTION_KEYS) {
    const value = answers[key];
    const numericValue =
      typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isInteger(numericValue) || (numericValue !== 0 && numericValue !== 1)) {
      return { error: `Invalid answer for ${key}.` };
    }
    normalized[key] = numericValue;
  }
  return { value: normalized };
}

function normalizePartialAnswers(answers) {
  if (answers === null || answers === undefined) {
    return { value: null };
  }
  if (typeof answers !== "object") {
    return { error: "Answers must be an object." };
  }
  const normalized = {};
  let hasAny = false;
  for (const key of Object.keys(answers)) {
    if (!QUESTION_KEYS.includes(key)) {
      return { error: `Invalid answer for ${key}.` };
    }
    const value = answers[key];
    const numericValue =
      typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
    if (!Number.isInteger(numericValue) || (numericValue !== 0 && numericValue !== 1)) {
      return { error: `Invalid answer for ${key}.` };
    }
    normalized[key] = numericValue;
    hasAny = true;
  }
  return { value: hasAny ? normalized : null };
}

function normalizeTiebreaker(raw) {
  if (raw === null || raw === undefined || raw === "") {
    return { error: "Tiebreaker is required." };
  }
  const numeric = Number.parseFloat(raw);
  if (Number.isNaN(numeric)) {
    return { error: "Tiebreaker must be a number." };
  }
  return { value: numeric };
}

function rowToEntry(row) {
  if (!row) {
    return null;
  }
  const answers = {};
  for (const key of QUESTION_KEYS) {
    answers[key] = row[key];
  }
  return {
    entry_id: row.entry_id,
    name: row.name,
    is_master: Boolean(row.is_master),
    answers,
    tiebreaker: row.tiebreaker,
  };
}

app.post("/api/submit", (req, res) => {
  const { name, answers, tiebreaker } = req.body || {};
  if (!name || typeof name !== "string" || !name.trim()) {
    return res.status(400).json({ error: "Name is required." });
  }

  const normalizedAnswers = normalizeAnswers(answers);
  if (normalizedAnswers.error) {
    return res.status(400).json({ error: normalizedAnswers.error });
  }

  const normalizedTiebreaker = normalizeTiebreaker(tiebreaker);
  if (normalizedTiebreaker.error) {
    return res.status(400).json({ error: normalizedTiebreaker.error });
  }

  const entryId = crypto.randomUUID();

  try {
    insertEntryStmt.run({
      entry_id: entryId,
      name: name.trim(),
      is_master: 0,
      ...normalizedAnswers.value,
      tiebreaker: normalizedTiebreaker.value,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save entry." });
  }

  return res.json({ entry_id: entryId });
});

app.get("/api/entry/:entryId", (req, res) => {
  const { entryId } = req.params;
  const row = db.prepare("SELECT * FROM entries WHERE entry_id = ?").get(entryId);
  if (!row) {
    return res.status(404).json({ error: "Entry not found." });
  }
  return res.json({ entry: rowToEntry(row) });
});

app.get("/api/score/:entryId", (req, res) => {
  const { entryId } = req.params;
  const entryRow = db.prepare("SELECT * FROM entries WHERE entry_id = ?").get(entryId);
  if (!entryRow) {
    return res.status(404).json({ error: "Entry not found." });
  }
  const masterRow = db.prepare("SELECT * FROM entries WHERE is_master = 1 LIMIT 1").get();

  return res.json({
    entry: rowToEntry(entryRow),
    master: rowToEntry(masterRow),
  });
});

app.get("/api/scores", (req, res) => {
  const masterRow = db.prepare("SELECT * FROM entries WHERE is_master = 1 LIMIT 1").get();
  const entryRows = db
    .prepare("SELECT * FROM entries WHERE is_master = 0 ORDER BY created_at ASC")
    .all();

  return res.json({
    entries: entryRows.map(rowToEntry),
    master: rowToEntry(masterRow),
  });
});

app.get("/api/admin/master", (req, res) => {
  const masterRow = db.prepare("SELECT * FROM entries WHERE is_master = 1 LIMIT 1").get();
  return res.json({ master: rowToEntry(masterRow) });
});

app.post("/api/admin/master", (req, res) => {
  const { answers, tiebreaker } = req.body || {};

  const normalizedAnswers = normalizePartialAnswers(answers);
  if (normalizedAnswers.error) {
    return res.status(400).json({ error: normalizedAnswers.error });
  }

  const hasTiebreaker = tiebreaker !== null && tiebreaker !== undefined && tiebreaker !== "";
  const normalizedTiebreaker = hasTiebreaker ? normalizeTiebreaker(tiebreaker) : { value: null };
  if (normalizedTiebreaker.error) {
    return res.status(400).json({ error: normalizedTiebreaker.error });
  }

  if (!normalizedAnswers.value && !hasTiebreaker) {
    return res.status(400).json({ error: "No updates provided." });
  }

  const existingMaster = db.prepare("SELECT * FROM entries WHERE is_master = 1 LIMIT 1").get();
  const baseAnswers = {};
  for (const key of QUESTION_KEYS) {
    baseAnswers[key] = existingMaster ? existingMaster[key] : null;
  }
  const mergedAnswers = normalizedAnswers.value
    ? { ...baseAnswers, ...normalizedAnswers.value }
    : baseAnswers;
  const mergedTiebreaker = hasTiebreaker
    ? normalizedTiebreaker.value
    : existingMaster
    ? existingMaster.tiebreaker
    : null;

  try {
    upsertMasterStmt.run({
      entry_id: "MASTER_SHEET",
      name: "Master Sheet",
      ...mergedAnswers,
      tiebreaker: mergedTiebreaker,
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save master sheet." });
  }

  return res.json({ ok: true });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log(`Admin page: http://localhost:${PORT}${ADMIN_PATH}`);
});
