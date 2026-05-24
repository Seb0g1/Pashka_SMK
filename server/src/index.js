require("dotenv").config();

const bcrypt = require("bcryptjs");
const cors = require("cors");
const express = require("express");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const PORT = Number(process.env.PORT || 3001);
const DATABASE_URL = process.env.DATABASE_URL || "postgres://smk:smk_password@localhost:5432/smk";
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const QR_BASE_URL = "smk-tech-request://new";

const pool = new Pool({
  connectionString: DATABASE_URL,
});

const demoUsers = [
  {
    login: "admin",
    password: "admin123",
    fullName: "Алексей Орлов",
    role: "admin",
    position: "Администратор системы",
    department: "ИТ-служба",
    phone: "+7 900 100-10-01",
  },
  {
    login: "dispatcher",
    password: "disp123",
    fullName: "Ольга Смирнова",
    role: "dispatcher",
    position: "Диспетчер ремонтной службы",
    department: "Производственная диспетчерская",
    phone: "+7 900 100-10-02",
  },
  {
    login: "master",
    password: "master123",
    fullName: "Павел Морозов",
    role: "technician",
    position: "Мастер ремонтной смены",
    department: "Ремонтно-механический участок",
    phone: "+7 900 100-10-03",
  },
  {
    login: "operator",
    password: "operator123",
    fullName: "Иван Петров",
    role: "operator",
    position: "Оператор линии",
    department: "Механический цех",
    phone: "+7 900 100-10-04",
  },
  {
    login: "anna",
    password: "anna123",
    fullName: "Анна Соколова",
    role: "operator",
    position: "Оператор пресса",
    department: "Кузнечно-прессовый комплекс",
    phone: "+7 900 100-10-05",
  },
];

const seedMachines = [
  {
    id: "SMK-CNC-014",
    name: "Станок ЧПУ HAAS VF-4",
    area: "Механический цех",
    line: "Линия механообработки",
    responsible: "Мастер ремонтной смены",
    responsibleLogin: "master",
    status: "Работает",
    imageKey: "machine",
  },
  {
    id: "SMK-PRESS-022",
    name: "Кривошипный пресс КД2128",
    area: "Кузнечно-прессовый комплекс",
    line: "Участок прессования",
    responsible: "Мастер ремонтной смены",
    responsibleLogin: "master",
    status: "Требует осмотр",
    imageKey: "shop",
  },
  {
    id: "SMK-FURN-007",
    name: "Печь термообработки ПТ-7",
    area: "Термический участок",
    line: "Линия термообработки",
    responsible: "Диспетчер ремонтной службы",
    responsibleLogin: "dispatcher",
    status: "Работает",
    imageKey: "plant",
  },
];

const seedRequests = [
  {
    publicId: "TZ-1049",
    machineId: "SMK-PRESS-022",
    problemType: "Механика",
    priority: "Высокий",
    description:
      "Посторонний стук при ходе ползуна. Оператор остановил работу до осмотра.",
    reporterLogin: "anna",
    assigneeLogin: "master",
    status: "В работе",
    createdAt: "2026-05-10T12:42:00.000Z",
  },
  {
    publicId: "TZ-1048",
    machineId: "SMK-CNC-014",
    problemType: "Электрика",
    priority: "Средний",
    description:
      "Периодически пропадает сигнал датчика закрытия двери защитного кожуха.",
    reporterLogin: "operator",
    assigneeLogin: "master",
    status: "Новая",
    createdAt: "2026-05-10T11:10:00.000Z",
  },
  {
    publicId: "TZ-1047",
    machineId: "SMK-FURN-007",
    problemType: "Температура",
    priority: "Критический",
    description:
      "Температура камеры не выходит на заданный режим, партия поставлена на паузу.",
    reporterLogin: "dispatcher",
    assigneeLogin: "dispatcher",
    status: "Ожидает детали",
    createdAt: "2026-05-09T15:30:00.000Z",
  },
];

const statuses = ["Новая", "В работе", "Ожидает детали", "Выполнена"];
const problemTypes = ["Механика", "Электрика", "Гидравлика", "Температура", "ПО/ЧПУ", "Безопасность"];
const priorities = ["Низкий", "Средний", "Высокий", "Критический"];

const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));

app.get("/api/health", asyncHandler(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true, database: "postgresql" });
}));

app.post("/api/auth/login", asyncHandler(async (req, res) => {
  const login = String(req.body?.login || "").trim().toLowerCase();
  const password = String(req.body?.password || "").trim();

  if (!login || !password) {
    return res.status(400).json({ error: "Введите логин и пароль." });
  }

  const { rows } = await pool.query(
    `SELECT id, login, password_hash, full_name, role, position, department, phone, is_active
       FROM users
      WHERE lower(login) = $1 AND is_active = TRUE
      LIMIT 1`,
    [login],
  );
  const user = rows[0];

  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Неверный логин или пароль." });
  }

  const token = jwt.sign(
    { sub: user.id, role: user.role },
    JWT_SECRET,
    { expiresIn: "8h" },
  );

  res.json({ token, user: publicUser(user) });
}));

app.use("/api", requireAuth);

app.get("/api/machines", asyncHandler(async (_req, res) => {
  const { rows } = await pool.query(machineSelectSql());
  res.json(rows);
}));

app.get("/api/users", asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.json([publicUser(req.user)]);
  }

  const { rows } = await pool.query(
    `SELECT id, login, full_name, role, position, department, phone, is_active
       FROM users
      ORDER BY id`,
  );
  res.json(rows);
}));

app.get("/api/requests", asyncHandler(async (req, res) => {
  const { sql, params } = requestsSelectForUser(req.user);
  const { rows } = await pool.query(sql, params);
  res.json(rows);
}));

app.get("/api/requests/:publicId", asyncHandler(async (req, res) => {
  const { rows } = await pool.query(
    `${requestSelectSql()} WHERE r.public_id = $1 LIMIT 1`,
    [req.params.publicId],
  );
  const request = rows[0];

  if (!request) {
    return res.status(404).json({ error: "Заявка не найдена." });
  }

  if (!canViewRequest(req.user, request)) {
    return res.status(403).json({ error: "Недостаточно прав для просмотра заявки." });
  }

  const history = await pool.query(
    `SELECT h.id, h.status, h.comment, COALESCE(u.full_name, 'Система') AS changed_by_name, h.changed_at
       FROM request_history h
       LEFT JOIN users u ON u.id = h.changed_by_user_id
      WHERE h.request_id = $1
      ORDER BY h.changed_at ASC, h.id ASC`,
    [request.id],
  );

  res.json({ request, history: history.rows });
}));

app.post("/api/requests", asyncHandler(async (req, res) => {
  const machineId = String(req.body?.machineId || "").trim();
  const problemType = String(req.body?.problemType || "").trim();
  const priority = String(req.body?.priority || "").trim();
  const description = String(req.body?.description || "").trim();

  if (!machineId || !problemTypes.includes(problemType) || !priorities.includes(priority) || description.length < 5) {
    return res.status(400).json({ error: "Проверьте станок, тип проблемы, приоритет и описание." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const machineResult = await client.query(
      "SELECT id, responsible_user_id, responsible FROM machines WHERE id = $1",
      [machineId],
    );
    const machine = machineResult.rows[0];

    if (!machine) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Станок не найден." });
    }

    const publicId = await nextPublicId(client);
    const assigneeUserId = machine.responsible_user_id || null;
    const assigneeName = await userNameById(client, assigneeUserId, machine.responsible);
    const now = new Date();

    const insertResult = await client.query(
      `INSERT INTO requests
        (public_id, machine_id, problem_type, priority, description,
         reporter_user_id, reporter_name, assignee_user_id, assignee_name,
         status, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'Новая', $10, $10)
       RETURNING id, public_id`,
      [
        publicId,
        machineId,
        problemType,
        priority,
        description,
        req.user.id,
        req.user.full_name,
        assigneeUserId,
        assigneeName,
        now,
      ],
    );

    await client.query(
      `INSERT INTO request_history
        (request_id, status, comment, changed_by_user_id, changed_at)
       VALUES ($1, 'Новая', 'Заявка создана', $2, $3)`,
      [insertResult.rows[0].id, req.user.id, now],
    );

    await client.query("COMMIT");
    res.status(201).json({ publicId: insertResult.rows[0].public_id });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.patch("/api/requests/:publicId/status", asyncHandler(async (req, res) => {
  if (!canChangeStatus(req.user)) {
    return res.status(403).json({ error: "Недостаточно прав для изменения статуса." });
  }

  const status = String(req.body?.status || "").trim();
  if (!statuses.includes(status)) {
    return res.status(400).json({ error: "Некорректный статус заявки." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const requestResult = await client.query(
      "SELECT id, status FROM requests WHERE public_id = $1 FOR UPDATE",
      [req.params.publicId],
    );
    const request = requestResult.rows[0];

    if (!request) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Заявка не найдена." });
    }

    const now = new Date();
    const closedAt = status === "Выполнена" ? now : null;

    await client.query(
      `UPDATE requests
          SET status = $1,
              updated_at = $2,
              closed_at = $3
        WHERE id = $4`,
      [status, now, closedAt, request.id],
    );

    await client.query(
      `INSERT INTO request_history
        (request_id, status, comment, changed_by_user_id, changed_at)
       VALUES ($1, $2, $3, $4, $5)`,
      [request.id, status, `Статус изменен: ${request.status} -> ${status}`, req.user.id, now],
    );

    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.post("/api/qr/resolve", asyncHandler(async (req, res) => {
  const raw = String(req.body?.value || "").trim();
  if (!raw) {
    return res.status(400).json({ error: "QR-код пустой." });
  }

  const parsed = parseQrPayload(raw);
  const lookupValue = parsed.qrValue || raw;
  const qrResult = await pool.query(
    `SELECT machine_id
       FROM machine_qr_codes
      WHERE qr_value = $1 OR payload = $2
      LIMIT 1`,
    [lookupValue, raw],
  );

  if (qrResult.rows[0]?.machine_id) {
    return res.json({ machineId: qrResult.rows[0].machine_id, source: "database" });
  }

  if (parsed.machineId) {
    const machineResult = await pool.query("SELECT id FROM machines WHERE id = $1", [parsed.machineId]);
    if (machineResult.rows[0]) {
      return res.json({ machineId: parsed.machineId, source: "legacy" });
    }
  }

  res.json({ machineId: null });
}));

app.post("/api/machines/:machineId/qr", asyncHandler(async (req, res) => {
  if (!canManageQr(req.user)) {
    return res.status(403).json({ error: "QR-коды может менять только админ или диспетчер." });
  }

  const machineId = String(req.params.machineId || "").trim();
  const machineResult = await pool.query("SELECT id FROM machines WHERE id = $1", [machineId]);
  if (!machineResult.rows[0]) {
    return res.status(404).json({ error: "Станок не найден." });
  }

  const scannedValue = String(req.body?.scannedValue || "").trim();
  const qrValue = scannedValue ? parseQrPayload(scannedValue).qrValue || scannedValue : createQrValue(machineId);
  const payload = scannedValue || buildQrPayload(qrValue);

  try {
    const { rows } = await pool.query(
      `INSERT INTO machine_qr_codes
        (machine_id, qr_value, payload, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       ON CONFLICT (machine_id)
       DO UPDATE SET
         qr_value = EXCLUDED.qr_value,
         payload = EXCLUDED.payload,
         created_by_user_id = EXCLUDED.created_by_user_id,
         updated_at = NOW()
       RETURNING machine_id, qr_value, payload, updated_at AS qr_updated_at`,
      [machineId, qrValue, payload, req.user.id],
    );
    res.json(rows[0]);
  } catch (error) {
    if (error.code === "23505") {
      return res.status(409).json({ error: "Этот QR-код уже привязан к другому станку." });
    }
    throw error;
  }
}));

app.post("/api/demo/reset", asyncHandler(async (req, res) => {
  if (req.user.role !== "admin") {
    return res.status(403).json({ error: "Сброс демо-базы доступен только админу." });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("TRUNCATE request_history, requests, machine_qr_codes, machines, users RESTART IDENTITY CASCADE");
    await seedDemoData(client);
    await client.query("COMMIT");
    res.json({ ok: true });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({
    error: err.publicMessage || "Ошибка сервера PostgreSQL API.",
  });
});

async function main() {
  await initializeDatabase();
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`SMK PostgreSQL API is running on http://0.0.0.0:${PORT}`);
  });
}

async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGSERIAL PRIMARY KEY,
      login TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'dispatcher', 'technician', 'operator')),
      position TEXT NOT NULL,
      department TEXT NOT NULL,
      phone TEXT NOT NULL,
      is_active BOOLEAN NOT NULL DEFAULT TRUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS machines (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      area TEXT NOT NULL,
      line TEXT NOT NULL,
      responsible TEXT NOT NULL,
      responsible_user_id BIGINT REFERENCES users(id),
      status TEXT NOT NULL,
      image_key TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS machine_qr_codes (
      id BIGSERIAL PRIMARY KEY,
      machine_id TEXT NOT NULL UNIQUE REFERENCES machines(id) ON DELETE CASCADE,
      qr_value TEXT NOT NULL UNIQUE,
      payload TEXT NOT NULL UNIQUE,
      created_by_user_id BIGINT REFERENCES users(id),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS requests (
      id BIGSERIAL PRIMARY KEY,
      public_id TEXT NOT NULL UNIQUE,
      machine_id TEXT NOT NULL REFERENCES machines(id),
      problem_type TEXT NOT NULL,
      priority TEXT NOT NULL,
      description TEXT NOT NULL,
      reporter_user_id BIGINT REFERENCES users(id),
      reporter_name TEXT NOT NULL,
      assignee_user_id BIGINT REFERENCES users(id),
      assignee_name TEXT NOT NULL,
      status TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      closed_at TIMESTAMPTZ
    );

    CREATE TABLE IF NOT EXISTS request_history (
      id BIGSERIAL PRIMARY KEY,
      request_id BIGINT NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
      status TEXT NOT NULL,
      comment TEXT NOT NULL,
      changed_by_user_id BIGINT REFERENCES users(id),
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_requests_status ON requests(status);
    CREATE INDEX IF NOT EXISTS idx_requests_machine ON requests(machine_id);
    CREATE INDEX IF NOT EXISTS idx_requests_reporter ON requests(reporter_user_id);
    CREATE INDEX IF NOT EXISTS idx_requests_assignee ON requests(assignee_user_id);
    CREATE INDEX IF NOT EXISTS idx_machine_qr_value ON machine_qr_codes(qr_value);
    CREATE INDEX IF NOT EXISTS idx_machine_qr_payload ON machine_qr_codes(payload);
  `);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await seedDemoData(client);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function seedDemoData(client) {
  const userCount = await scalar(client, "SELECT COUNT(*)::int AS value FROM users");
  if (!userCount) {
    for (const user of demoUsers) {
      const passwordHash = await bcrypt.hash(user.password, 10);
      await client.query(
        `INSERT INTO users
          (login, password_hash, full_name, role, position, department, phone)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [user.login, passwordHash, user.fullName, user.role, user.position, user.department, user.phone],
      );
    }
  }

  const machineCount = await scalar(client, "SELECT COUNT(*)::int AS value FROM machines");
  if (!machineCount) {
    for (const machine of seedMachines) {
      const responsible = await client.query("SELECT id FROM users WHERE login = $1", [machine.responsibleLogin]);
      await client.query(
        `INSERT INTO machines
          (id, name, area, line, responsible, responsible_user_id, status, image_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          machine.id,
          machine.name,
          machine.area,
          machine.line,
          machine.responsible,
          responsible.rows[0]?.id || null,
          machine.status,
          machine.imageKey,
        ],
      );
    }
  }

  await ensureMachineQrCodes(client);

  const requestCount = await scalar(client, "SELECT COUNT(*)::int AS value FROM requests");
  if (!requestCount) {
    for (const request of seedRequests) {
      const reporter = await client.query("SELECT id, full_name FROM users WHERE login = $1", [request.reporterLogin]);
      const assignee = await client.query("SELECT id, full_name FROM users WHERE login = $1", [request.assigneeLogin]);
      const requestResult = await client.query(
        `INSERT INTO requests
          (public_id, machine_id, problem_type, priority, description,
           reporter_user_id, reporter_name, assignee_user_id, assignee_name,
           status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11)
         RETURNING id`,
        [
          request.publicId,
          request.machineId,
          request.problemType,
          request.priority,
          request.description,
          reporter.rows[0]?.id || null,
          reporter.rows[0]?.full_name || "Сотрудник",
          assignee.rows[0]?.id || null,
          assignee.rows[0]?.full_name || "Ремонтная служба",
          request.status,
          request.createdAt,
        ],
      );

      await client.query(
        `INSERT INTO request_history
          (request_id, status, comment, changed_by_user_id, changed_at)
         VALUES ($1, $2, 'Стартовая запись демо-базы', $3, $4)`,
        [
          requestResult.rows[0].id,
          request.status,
          assignee.rows[0]?.id || reporter.rows[0]?.id || null,
          request.createdAt,
        ],
      );
    }
  }
}

async function ensureMachineQrCodes(client) {
  const { rows } = await client.query(
    `SELECT m.id
       FROM machines m
       LEFT JOIN machine_qr_codes q ON q.machine_id = m.id
      WHERE q.id IS NULL`,
  );

  for (const row of rows) {
    const qrValue = createQrValue(row.id);
    await client.query(
      `INSERT INTO machine_qr_codes
        (machine_id, qr_value, payload, created_by_user_id, created_at, updated_at)
       VALUES ($1, $2, $3, NULL, NOW(), NOW())
       ON CONFLICT DO NOTHING`,
      [row.id, qrValue, buildQrPayload(qrValue)],
    );
  }
}

function machineSelectSql() {
  return `
    SELECT
      m.id,
      m.name,
      m.area,
      m.line,
      m.responsible,
      m.responsible_user_id,
      m.status,
      m.image_key,
      q.qr_value,
      q.payload AS qr_payload,
      q.updated_at AS qr_updated_at
    FROM machines m
    LEFT JOIN machine_qr_codes q ON q.machine_id = m.id
    ORDER BY m.id
  `;
}

function requestSelectSql() {
  return `
    SELECT
      r.id,
      r.public_id,
      r.machine_id,
      m.name AS machine_name,
      m.area,
      m.line,
      m.image_key,
      r.problem_type,
      r.priority,
      r.description,
      r.reporter_user_id,
      r.reporter_name,
      COALESCE(reporter.full_name, r.reporter_name) AS reporter_display,
      r.assignee_user_id,
      r.assignee_name,
      COALESCE(assignee.full_name, r.assignee_name) AS assignee_display,
      r.status,
      r.created_at,
      r.updated_at,
      r.closed_at
    FROM requests r
    JOIN machines m ON m.id = r.machine_id
    LEFT JOIN users reporter ON reporter.id = r.reporter_user_id
    LEFT JOIN users assignee ON assignee.id = r.assignee_user_id
  `;
}

function requestsSelectForUser(user) {
  const params = [];
  const conditions = [];

  if (user.role === "operator") {
    params.push(user.id);
    conditions.push(`r.reporter_user_id = $${params.length}`);
  }

  if (user.role === "technician") {
    params.push(user.id);
    conditions.push(`r.assignee_user_id = $${params.length}`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return {
    sql: `${requestSelectSql()} ${where} ORDER BY r.created_at DESC`,
    params,
  };
}

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    if (!token) {
      return res.status(401).json({ error: "Нужна авторизация." });
    }

    const payload = jwt.verify(token, JWT_SECRET);
    const { rows } = await pool.query(
      `SELECT id, login, full_name, role, position, department, phone, is_active
         FROM users
        WHERE id = $1 AND is_active = TRUE
        LIMIT 1`,
      [payload.sub],
    );

    if (!rows[0]) {
      return res.status(401).json({ error: "Пользователь не найден или отключен." });
    }

    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: "Сессия истекла. Войдите заново." });
  }
}

function asyncHandler(handler) {
  return (req, res, next) => {
    Promise.resolve(handler(req, res, next)).catch(next);
  };
}

function publicUser(row) {
  return {
    id: row.id,
    login: row.login,
    full_name: row.full_name,
    role: row.role,
    position: row.position,
    department: row.department,
    phone: row.phone,
    is_active: row.is_active,
  };
}

function canChangeStatus(user) {
  return ["admin", "dispatcher", "technician"].includes(user.role);
}

function canManageQr(user) {
  return ["admin", "dispatcher"].includes(user.role);
}

function canViewRequest(user, request) {
  if (user.role === "operator") {
    return Number(request.reporter_user_id) === Number(user.id);
  }

  if (user.role === "technician") {
    return Number(request.assignee_user_id) === Number(user.id);
  }

  return true;
}

function parseQrPayload(value) {
  const raw = String(value || "").trim();
  return {
    raw,
    qrValue: getQueryParam(raw, "qr"),
    machineId: getQueryParam(raw, "machineId"),
  };
}

function getQueryParam(value, key) {
  const queryStart = value.indexOf("?");
  if (queryStart === -1) {
    return "";
  }

  for (const part of value.slice(queryStart + 1).split("&")) {
    const [rawName, rawValue = ""] = part.split("=");
    if (rawName === key) {
      try {
        return decodeURIComponent(rawValue.replace(/\+/g, " "));
      } catch {
        return rawValue;
      }
    }
  }

  return "";
}

function createQrValue(machineId) {
  const machinePart = machineId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8);
  return `smk-${machinePart}-${Date.now().toString(36)}-${randomPart}`;
}

function buildQrPayload(qrValue) {
  return `${QR_BASE_URL}?qr=${encodeURIComponent(qrValue)}`;
}

async function nextPublicId(client) {
  const { rows } = await client.query(
    `SELECT COALESCE(MAX(substring(public_id from '^TZ-([0-9]+)$')::int), 1049) + 1 AS next_id
       FROM requests
      WHERE public_id ~ '^TZ-[0-9]+$'`,
  );
  return `TZ-${rows[0].next_id}`;
}

async function userNameById(client, userId, fallback) {
  if (!userId) {
    return fallback || "Ремонтная служба";
  }

  const { rows } = await client.query("SELECT full_name FROM users WHERE id = $1", [userId]);
  return rows[0]?.full_name || fallback || "Ремонтная служба";
}

async function scalar(client, sql, params = []) {
  const { rows } = await client.query(sql, params);
  return Number(rows[0]?.value || 0);
}

main().catch((error) => {
  console.error("Failed to start SMK PostgreSQL API", error);
  process.exit(1);
});
