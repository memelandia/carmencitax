// Reactivar: vuelve a tener todas sus tiradas (igual que antes). Abre una ronda nueva para que el fan
// pueda volver a ganar los premios del código. Solo admin.
const { sql, json, ruletaId, leerBody, verificarAdmin, noAutorizado, evento, normCodigo, handler } = require('./utils/db');

exports.handler = handler(['POST'], async (event) => {
  const rid = await ruletaId();
  if ((await verificarAdmin(event)) !== rid) return noAutorizado();
  const codigo = normCodigo((leerBody(event) || {}).codigoId);
  if (!codigo) return json(400, { success: false, message: 'El campo codigoId es requerido.' });
  const [r] = await sql`
    UPDATE ruletas.codigo SET usado = false, tiradas_restantes = tiradas_totales, ronda = ronda + 1, ganados_previos = 0,
           expirado_at = NULL, reactivado_at = NOW(), actualizado_at = NOW()
    WHERE ruleta_id = ${rid} AND codigo_norm = ${codigo} AND eliminado_at IS NULL
    RETURNING id, tiradas_totales`;
  if (!r) return json(404, { success: false, message: 'Código no encontrado para reactivar' });
  await evento(rid, 'reactivar', { codigo, tiradas: r.tiradas_totales }, r.id);
  return json(200, { success: true, message: 'Código reactivado con éxito.' });
});
