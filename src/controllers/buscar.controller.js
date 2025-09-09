// src/controllers/buscar.controller.js
const { query, sql } = require('../db/sqlserver');

const allowedBarcodeCols = new Set([
  'CodigoBarra','CodigoBarras','Codigo_Barra','CodBarra','EAN','UPC','CodigoDeBarras'
]);
const envCol = (process.env.BARCODE_COL || '').trim();
const BARCODE_COL = allowedBarcodeCols.has(envCol) ? envCol : 'CodigoBarra';

module.exports.buscar = async (req, res, next) => {
  try {
    const data = Object.keys(req.body || {}).length ? req.body : req.query;

    const referencia = (data.referencia || data.ref || data.q || data.termino || data.codigo || '').toString().trim();
    const barcode    = (data.barcode || data.codigo_barra || data.codigobarra || data.codbarra || data.ean || data.upc || '').toString().trim();

    // ⬇️ NUEVO: si viene one=1, limitamos la salida a 1 fila
    const one = (data.one === '1' || data.one === 1 || data.one === true);

    // ¿Quiere HTML?
    const wantsHTML = (data.html === '1' || data.view === '1' || req.accepts(['html','json']) === 'html');

    let sqlText, params, modo, filtroTexto;

    if (barcode) {
      modo = 'barcode';
      filtroTexto = barcode;
      sqlText = `
        SELECT TOP 50
          Referencia,
          Nombre,
          PrecioDetal,
          CostoDolar,
          ${BARCODE_COL} AS CodigoBarra
        FROM dbo.INVENTARIO
        WHERE ${BARCODE_COL} = @barcode
        ORDER BY Referencia
      `;
      params = [{ name: 'barcode', type: sql.VarChar, value: barcode }];
    } else if (referencia) {
      modo = 'referencia';
      filtroTexto = referencia;
      sqlText = `
        SELECT TOP 50
          Referencia,
          Nombre,
          PrecioDetal,
          CostoDolar,
          ${BARCODE_COL} AS CodigoBarra
        FROM dbo.INVENTARIO
        WHERE Referencia LIKE @filtro
        ORDER BY Referencia
      `;
      params = [{ name: 'filtro', type: sql.VarChar, value: `%${referencia}%` }];
    } else {
      const msg = 'Falta parámetro: usa referencia/ref/q/termino/codigo o barcode/codigo_barra/ean/upc';
      return wantsHTML
        ? res.status(400).send(`<p style="font-family:system-ui">Error: ${msg}</p>`)
        : res.status(400).json({ ok: false, error: msg });
    }

    const result = await query(sqlText, params);
    const rows = result.recordset;
    const rowsOut = one ? rows.slice(0, 1) : rows;  // ⬅️ aplica el límite

    if (wantsHTML) {
      return res.render('resultados', { items: rowsOut, filtro: filtroTexto, modo });
    }

    return res.json({
      ok: true,
      by: modo,
      one: !!one,
      count: rowsOut.length,
      data: rowsOut
    });
  } catch (err) {
    next(err);
  }
};
