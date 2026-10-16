// Crear (o re-crear) un código. Igual que antes: tiradas = cantidad de premios asignados; si el código ya
// existía, se sobrescribe y queda como nuevo (ronda nueva → historial limpio). Solo admin.
const { sql, json, ruletaId, leerBody, verificarAdmin, noAutorizado, evento, normCodigo, listaPremios, handler } = require('./utils/db');

exports.handler = handler(['POST'], async (event) => {
  const rid = await ruletaId();
  if ((await verificarAdmin(event)) !== rid) return noAutorizado();
  const body = leerBody(event) || {};
  const codigo = String(body.codigoId || '').trim();
  const nombreFan = String(body.nombreFan || '').trim();
  const premios = listaPremios(body.premios);
  if (!codigo || !nombreFan || !premios || !premios.length) {
    return json(400, { success: false, message: 'Faltan datos requeridos o formato incorrecto.' });
  }
  if (codigo.length > 60 || nombreFan.length > 80 || premios.length > 40) {
    return json(400, { success: false, message: 'Código, nombre o premios demasiado largos.' });
  }
  const total = premios.length;
  const [r] = await sql`
    INSERT INTO ruletas.codigo (ruleta_id, codigo, codigo_norm, nombre_fan, premios, tiradas_totales, tiradas_restantes, usado, origen)
    VALUES (${rid}, ${codigo}, ${normCodigo(codigo)}, ${nombreFan}, ${JSON.stringify(premios)}::jsonb, ${total}, ${total}, false,
            ${/^ZZTEST/i.test(codigo) ? 'prueba' : 'postgres'})
    ON CONFLICT (ruleta_id, codigo_norm) DO UPDATE SET
      codigo = EXCLUDED.codigo, nombre_fan = EXCLUDED.nombre_fan, premios = EXCLUDED.premios,
      tiradas_totales = EXCLUDED.tiradas_totales, tiradas_restantes = EXCLUDED.tiradas_restantes,
      usado = false, ronda = ruletas.codigo.ronda + 1, ganados_previos = 0,
      expirado_at = NULL, eliminado_at = NULL, actualizado_at = NOW()
    RETURNING id, (xmax = 0) AS creado`;
  const operation = r.creado ? 'created' : 'updated';
  await evento(rid, r.creado ? 'crear' : 'actualizar', { codigo, nombreFan, premios }, r.id);
  return json(200, { success: true, message: `Código ${operation} con éxito`, operation });
});
