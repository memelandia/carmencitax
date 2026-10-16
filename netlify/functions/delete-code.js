// Eliminar un código. Desaparece del admin y de la ruleta; en la base queda marcado (eliminado_at) para
// auditoría y para poder revertir la migración sin perder datos. Solo admin.
const { sql, json, ruletaId, leerBody, verificarAdmin, noAutorizado, evento, normCodigo, handler } = require('./utils/db');

exports.handler = handler(['DELETE', 'POST'], async (event) => {
  const rid = await ruletaId();
  if ((await verificarAdmin(event)) !== rid) return noAutorizado();
  const codigo = normCodigo((leerBody(event) || {}).codigoId);
  if (!codigo) return json(400, { success: false, message: 'El campo codigoId es requerido.' });
  // al borrar se libera el texto: el código queda archivado con un sufijo y se puede volver a crear
  const [r] = await sql`
    UPDATE ruletas.codigo SET eliminado_at = NOW(), actualizado_at = NOW(),
           codigo_norm = codigo_norm || '#BORRADO-' || id
    WHERE ruleta_id = ${rid} AND codigo_norm = ${codigo} AND eliminado_at IS NULL
    RETURNING id`;
  if (!r) return json(404, { success: false, message: 'Código no encontrado para eliminar' });
  await evento(rid, 'eliminar', { codigo }, r.id);
  return json(200, { success: true, message: 'Código eliminado con éxito.' });
});
