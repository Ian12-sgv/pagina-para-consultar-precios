// src/db/sqlserver.js (SQL Auth con instancia nombrada)
const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_HOST,                 // ej. DESKTOP-POH8VL8
  database: process.env.DB_NAME,               // ej. TuBase
  user: process.env.DB_USER,                   // ej. blumer_user
  password: process.env.DB_PASS,               // ej. TuPassword
  options: {
    encrypt: false,
    trustServerCertificate: true,
    instanceName: process.env.DB_INSTANCE || undefined // ej. ANALISTA
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

let pool;
async function getPool() {
  if (!pool) pool = await sql.connect(config);
  return pool;
}
async function query(q, params = []) {
  const p = await getPool();
  const req = p.request();
  for (const prm of params) req.input(prm.name, prm.type, prm.value);
  return req.query(q);
}

module.exports = { sql, getPool, query };
