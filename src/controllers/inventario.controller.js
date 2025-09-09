// src/controllers/inventario.controller.js
const pool = require('../db/mysql');

exports.health = async (req, res) => {
  try { await pool.query('SELECT 1'); res.json({ ok: true }); }
  catch (e) { res.status(500).json({ ok: false, error: e.message }); }
};

exports.list = async (req, res) => {
  const limit  = Math.min(Number(req.query.limit) || 50, 500);
  const offset = Number(req.query.offset) || 0;
  const search = (req.query.search || '').toString().trim();

  let where = ''; const params = [];
  if (search) {
    where = 'WHERE CodigoBarra = ? OR Referencia LIKE ? OR Nombre LIKE ?';
    params.push(search, `%${search}%`, `%${search}%`);
  }

  const sql = `
    SELECT CodigoBarra, Referencia, Nombre, PrecioDetal, CostoInicial
    FROM inventario_web
    ${where}
    ORDER BY id DESC
    LIMIT ? OFFSET ?`;
  params.push(limit, offset);

  try {
    const [rows] = await pool.execute(sql, params);
    res.json({ count: rows.length, items: rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'DB_ERROR', detail: e.message });
  }
};
