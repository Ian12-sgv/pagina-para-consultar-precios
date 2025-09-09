// src/app.js
const path = require('path');
const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();


// Controladores y DB
const { buscar } = require('./controllers/buscar.controller'); // maneja /buscar(.php)
const { query, sql } = require('./db/sqlserver');              // utilidades SQL Server

const app = express();

/* =======================
   Configuración de vistas
   ======================= */
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '..', 'views'));

/* =======================
   Archivos estáticos
   ======================= */
app.use(express.static(path.join(__dirname, '..', 'public')));

/* =======================
   Middlewares
   ======================= */
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

/* =======================
   Rutas
   ======================= */

// Home
// Home → Landing
app.get('/', (req, res) => {
  res.render('landing');
});


// Página de escaneo (funciona como /scan y /scan.php)
app.get(['/scan', '/scan.php'], (req, res) => {
  res.render('scan', { titulo: 'Escanear código' });
});

// Búsqueda compatible: /buscar y /buscar.php con GET o POST
app.all(['/buscar', '/buscar.php'], buscar);

// Detalle (HTML). Acepta ?referencia=... o ?barcode=...
app.get(['/detalle', '/detalle.php'], async (req, res, next) => {
  try {
    // Columna de código de barras (permitidas) — configurable por ENV BARCODE_COL
    const allowedBarcodeCols = new Set([
      'CodigoBarra', 'CodigoBarras', 'Codigo_Barra', 'CodBarra',
      'EAN', 'UPC', 'CodigoDeBarras'
    ]);
    const envCol = (process.env.BARCODE_COL || '').trim();
    const BARCODE_COL = allowedBarcodeCols.has(envCol) ? envCol : 'CodigoBarra';

    const ref = (req.query.referencia || '').toString().trim();
    const bc  = (req.query.barcode || '').toString().trim();

    if (!ref && !bc) {
      return res
        .status(400)
        .send('<p style="font-family:system-ui">Falta parámetro: referencia o barcode</p>');
    }

    let sqlText, params;
    if (bc) {
      sqlText = `
        SELECT TOP 1 Referencia, Nombre, PrecioDetal, CostoDolar, ${BARCODE_COL} AS CodigoBarra
        FROM dbo.INVENTARIO
        WHERE ${BARCODE_COL} = @bc
      `;
      params = [{ name: 'bc', type: sql.VarChar, value: bc }];
    } else {
      sqlText = `
        SELECT TOP 1 Referencia, Nombre, PrecioDetal, CostoDolar, ${BARCODE_COL} AS CodigoBarra
        FROM dbo.INVENTARIO
        WHERE Referencia = @ref
      `;
      params = [{ name: 'ref', type: sql.VarChar, value: ref }];
    }

    const result = await query(sqlText, params);
    const row = result.recordset && result.recordset[0];

    return res.render('detalle', {
      titulo: row ? `Detalle: ${row.Nombre || row.Referencia}` : 'No encontrado',
      item: row || null
    });
  } catch (err) {
    next(err);
  }
});

// Salud de la app
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

// Salud de la DB
app.get('/db/health', async (req, res) => {
  try {
    const result = await query('SELECT 1 AS ok, DB_NAME() AS db, SYSTEM_USER AS userName');
    res.json({ db: 'up', result: result.recordset });
  } catch (e) {
    console.error('DB error:', e);
    res.status(500).json({ db: 'down', error: e.message });
  }
});

/* =======================
   404 y manejador de errores
   ======================= */

// 404
app.use((req, res) => res.status(404).json({ error: 'Not Found' }));

// Manejador de errores (por si se usa next(err))
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ error: err.message || 'Server error' });
});

/* =======================
   Arranque del servidor
   ======================= */
const port = process.env.PORT || 5000;
app.listen(port, '0.0.0.0', () => {
  console.log(`Node escuchando en http://localhost:${port}`);
});

module.exports = app;
