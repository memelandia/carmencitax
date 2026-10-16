// Giro de la ruleta: el SERVIDOR elige el premio y descuenta la tirada en una sola operación atómica
// (ruletas.girar bloquea el código con FOR UPDATE). El navegador manda un requestId (UUID) por giro:
// reintentar con el mismo id devuelve el mismo premio sin volver a descontar.
const { sql, json, ruletaId, leerBody, normCodigo, handler } = require('./utils/db');
const textos = require('./utils/textos');

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

exports.handler = handler(['POST'], async (event) => {
  const rid = await ruletaId();
  const [r] = await sql`SELECT idioma FROM ruletas.ruleta WHERE id = ${rid}`;
  const t = textos(r && r.idioma);
  const body = leerBody(event);
  const codigo = normCodigo(body && body.codigoId);
  const requestId = String((body && body.requestId) || '');
  if (!codigo) return json(400, { success: false, message: t.requerido });
  if (!UUID.test(requestId)) return json(400, { success: false, message: t.solicitud });
  const excluir = Array.isArray(body.excluir)
    ? body.excluir.slice(0, 50).map((x) => String(x == null ? '' : x).trim()).filter(Boolean).filter((x) => x.length <= 120)
    : [];

  const [{ r: res }] = await sql`SELECT ruletas.girar(${rid}::smallint, ${codigo}, ${requestId}::uuid, ${excluir}::text[]) AS r`;
  if (!res.ok) {
    const map = {
      no_encontrado: [404, t.noEncontrado],
      sin_tiradas: [403, t.sinTiradas],
      todos_ganados: [409, t.todosGanados],
      premio_fuera_de_rueda: [409, t.fueraDeRueda],
    };
    const [code, message] = map[res.error] || [400, t.solicitud];
    return json(code, { success: false, error: res.error, message });
  }
  return json(200, {
    success: true,
    premio: res.premio,
    tiradasRestantes: res.tiradasRestantes,
    codigoExpirado: res.codigoExpirado,
    repetida: !!res.repetida,
  });
});
