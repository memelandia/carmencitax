// Configuración de la ruleta (nombre, avatar/foto, premios de la rueda).
// GET: público (lo usa la ruleta del fan). POST: solo admin con token válido.
const { sql, json, ruletaId, leerBody, verificarAdmin, noAutorizado, evento, listaPremios, handler } = require('./utils/db');

const MAX_AVATAR = 1500000; // ~1,1 MB de imagen en base64

exports.handler = handler(['GET', 'POST'], async (event) => {
  const rid = await ruletaId();
  if (event.httpMethod === 'GET') {
    const [r] = await sql`SELECT nombre_modelo, avatar_url, premios FROM ruletas.ruleta WHERE id = ${rid}`;
    return json(200, { success: true, data: { nombreModelo: r.nombre_modelo, avatarURL: r.avatar_url || '', premios: r.premios || [] } });
  }

  if ((await verificarAdmin(event)) !== rid) return noAutorizado();
  const body = leerBody(event);
  if (!body) return json(400, { success: false, message: 'Datos inválidos.' });
  const { nuevoNombreModelo, nuevaAvatarURL, nuevaListaPremios } = body;
  const cambios = {};
  if (nuevoNombreModelo !== undefined) {
    const n = String(nuevoNombreModelo).trim();
    if (!n || n.length > 60) return json(400, { success: false, message: 'Nombre inválido (1 a 60 caracteres).' });
    cambios.nombre = n;
  }
  if (nuevaAvatarURL !== undefined) {
    const a = String(nuevaAvatarURL || '');
    if (a && !/^data:image\/(jpeg|jpg|png|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(a)) return json(400, { success: false, message: 'Imagen inválida.' });
    if (a.length > MAX_AVATAR) return json(413, { success: false, message: 'La imagen es demasiado pesada.' });
    cambios.avatar = a;
  }
  if (nuevaListaPremios !== undefined) {
    const p = listaPremios(nuevaListaPremios);
    if (!p || p.length > 40) return json(400, { success: false, message: 'Lista de premios inválida.' });
    cambios.premios = p;
  }
  if (!Object.keys(cambios).length) return json(200, { success: true, message: 'Sin cambios.' });

  await sql`
    UPDATE ruletas.ruleta SET
      nombre_modelo = COALESCE(${cambios.nombre ?? null}, nombre_modelo),
      avatar_url = CASE WHEN ${'avatar' in cambios} THEN ${cambios.avatar ?? ''} ELSE avatar_url END,
      premios = COALESCE(${cambios.premios ? JSON.stringify(cambios.premios) : null}::jsonb, premios),
      actualizado_at = NOW()
    WHERE id = ${rid}`;
  await evento(rid, 'config', {
    nombre: cambios.nombre, premios: cambios.premios, avatar: 'avatar' in cambios ? (cambios.avatar ? 'actualizado' : 'quitado') : undefined,
  });
  return json(200, { success: true, message: 'Configuración actualizada con éxito.' });
});
