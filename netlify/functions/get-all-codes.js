// Listado de códigos para el admin (antes era público: cualquiera veía nombres de fans). Solo admin.
const { sql, json, ruletaId, verificarAdmin, noAutorizado, codigoPublico, handler } = require('./utils/db');

exports.handler = handler(['GET'], async (event) => {
  const rid = await ruletaId();
  if ((await verificarAdmin(event)) !== rid) return noAutorizado();
  const rows = await sql`
    SELECT codigo, nombre_fan, premios, usado, tiradas_totales, tiradas_restantes, expirado_at, creado_at
    FROM ruletas.codigo
    WHERE ruleta_id = ${rid} AND eliminado_at IS NULL
    ORDER BY creado_at DESC, id DESC`;
  return json(200, { success: true, data: rows.map(codigoPublico) });
});
