// Login del admin. Valida contra el hash guardado en PostgreSQL (pgcrypto/bcrypt) y devuelve un token
// firmado que el admin manda en cada operación. Mismas reglas que antes: usuario sin distinguir
// mayúsculas, ambos recortados de espacios de copiar/pegar; la contraseña sigue siendo exacta.
const { sql, json, ruletaId, leerBody, crearToken, evento, handler } = require('./utils/db');

exports.handler = handler(['POST'], async (event) => {
  const rid = await ruletaId();
  const body = leerBody(event);
  const username = String((body && body.username) || '').trim();
  const ua = String((event.headers && (event.headers['user-agent'] || event.headers['User-Agent'])) || '').slice(0, 200);
  const password = String((body && body.password) || '').trim();
  if (!username || !password) return json(400, { success: false, message: 'Username y password son requeridos.' });

  const [{ n }] = await sql`
    SELECT count(*)::int AS n FROM ruletas.evento
    WHERE ruleta_id = ${rid} AND tipo = 'login_fallido' AND creado_at > NOW() - interval '15 minutes'`;
  if (n >= 15) return json(429, { success: false, message: 'Demasiados intentos. Esperá unos minutos.' });

  const [r] = await sql`
    SELECT slug, sesion_version,
           (lower(btrim(admin_user)) = lower(${username}) AND crypt(${password}, admin_pass_hash) = admin_pass_hash) AS ok
    FROM ruletas.ruleta WHERE id = ${rid}`;
  if (!r || !r.ok) {
    await evento(rid, 'login_fallido', { usuario: username.slice(0, 60), ua });
    return json(401, { success: false, message: 'Credenciales incorrectas' });
  }
  await evento(rid, 'login_ok', { usuario: username.slice(0, 60), ua });
  return json(200, { success: true, message: 'Login exitoso', user: username, token: await crearToken(r.slug, r.sesion_version) });
});
