// Expirar un código: queda usado y sin tiradas (igual que antes). Solo admin.
const { sql, json, ruletaId, leerBody, verificarAdmin, noAutorizado, evento, normCodigo, handler } = require('./utils/db');

exports.handler = handler(['POST'], async (event) => {
  const rid = await ruletaId();
  if ((await verificarAdmin(event)) !== rid) return noAutorizado();
  const codigo = normCodigo((leerBody(event) || {}).codigoId);
  if (!codigo) return json(400, { success: false, message: 'El campo codigoId es requerido.' });
  const [r] = await sql`
    UPDATE ruletas.codigo SET usado = true, tiradas_restantes = 0, expirado_at = NOW(), actualizado_at = NOW()
    WHERE ruleta_id = ${rid} AND codigo_norm = ${codigo} AND eliminado_at IS NULL
    RETURNING id`;
  if (!r) return json(404, { success: false, message: 'Código no encontrado para expirar' });
  await evento(rid, 'expirar', { codigo }, r.id);
  return json(200, { success: true, message: 'Código expirado con éxito.' });
});
