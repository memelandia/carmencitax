// Valida un código para la ruleta pública. Misma respuesta que la versión anterior
// (nombreFan, premios, tiradasRestantes) + el historial de premios de la ronda actual, que ahora vive en el servidor.
const { sql, json, ruletaId, leerBody, normCodigo, handler } = require('./utils/db');
const textos = require('./utils/textos');

exports.handler = handler(['POST'], async (event) => {
  const rid = await ruletaId();
  const [r] = await sql`SELECT idioma FROM ruletas.ruleta WHERE id = ${rid}`;
  const t = textos(r && r.idioma);
  const body = leerBody(event);
  const codigo = normCodigo(body && body.codigoId);
  if (!codigo) return json(400, { success: false, message: t.requerido });
  if (codigo.length > 80) return json(404, { success: false, message: t.noEncontrado });

  const [c] = await sql`
    SELECT id, nombre_fan, premios, tiradas_totales, tiradas_restantes, usado, ronda, ganados_previos
    FROM ruletas.codigo
    WHERE ruleta_id = ${rid} AND codigo_norm = ${codigo} AND eliminado_at IS NULL`;
  if (!c) return json(404, { success: false, message: t.noEncontrado });
  if (c.usado || c.tiradas_restantes <= 0) return json(403, { success: false, message: t.usado });

  const historial = await sql`
    SELECT premio, creado_at FROM ruletas.tirada
    WHERE codigo_id = ${c.id} AND ronda = ${c.ronda} ORDER BY creado_at DESC, id DESC`;

  return json(200, {
    success: true,
    data: {
      nombreFan: c.nombre_fan,
      premios: c.premios || [],
      tiradasRestantes: c.tiradas_restantes,
      tiradasTotales: c.tiradas_totales,
      historial: historial.map((h) => ({ nombre: h.premio, timestamp: new Date(h.creado_at).getTime() })),
      // códigos que ya giraron antes de la migración: el detalle de esos premios quedó en el navegador del fan
      ganadosPrevios: c.ronda === 1 ? c.ganados_previos : 0,
    },
  });
});
