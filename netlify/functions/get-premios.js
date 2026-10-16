// Premios de la rueda (formato heredado: [{id, nombre}]). Público.
const { sql, json, ruletaId, handler } = require('./utils/db');

exports.handler = handler(['GET'], async () => {
  const rid = await ruletaId();
  const [r] = await sql`SELECT premios FROM ruletas.ruleta WHERE id = ${rid}`;
  let lista = (r && r.premios) || [];
  if (!lista.length) lista = ['Premio Sorpresa', 'Pack Fotos Hot', 'Videollamada 5 minutos']; // igual que antes
  return json(200, { success: true, data: lista.map((nombre, i) => ({ id: `premio-${i + 1}`, nombre })) });
});
