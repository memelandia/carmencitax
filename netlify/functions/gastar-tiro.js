// Endpoint viejo: el navegador elegía el premio y después descontaba. Ahora el giro completo es /girar.
// Responde 410 para que una pestaña abierta con la versión anterior pida recargar, sin descontar nada.
const { json, ruletaId, sql, handler } = require('./utils/db');
const textos = require('./utils/textos');

exports.handler = handler(['POST'], async () => {
  const rid = await ruletaId();
  const [r] = await sql`SELECT idioma FROM ruletas.ruleta WHERE id = ${rid}`;
  return json(410, { success: false, message: textos(r && r.idioma).recargar });
});
