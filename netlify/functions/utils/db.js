// Acceso a PostgreSQL (Neon) desde las funciones de la ruleta (reemplaza al backend anterior).
// Variables de entorno del sitio (nunca llegan al navegador):
//   RULETAS_DATABASE_URL  → rol limitado `ruletas_app` (solo el esquema `ruletas`, sin DELETE)
//   RULETA_SLUG           → qué ruleta es este sitio (todas las consultas se filtran por su id)
//   RULETA_SESSION_SECRET → firma de los tokens de admin
const crypto = require('crypto');
const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.RULETAS_DATABASE_URL);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
};

const json = (statusCode, body) => ({ statusCode, headers: corsHeaders, body: JSON.stringify(body) });

let _ruletaId = null;
/** Id de la ruleta de este sitio (cacheado por contenedor; el slug no cambia). */
async function ruletaId() {
  if (_ruletaId) return _ruletaId;
  const slug = process.env.RULETA_SLUG;
  if (!slug) throw new Error('Falta RULETA_SLUG');
  const [r] = await sql`SELECT id FROM ruletas.ruleta WHERE slug = ${slug}`;
  if (!r) throw new Error('Ruleta no registrada: ' + slug);
  _ruletaId = r.id;
  return _ruletaId;
}

function leerBody(event) {
  if (!event.body) return {};
  try {
    const raw = event.isBase64Encoded ? Buffer.from(event.body, 'base64').toString('utf8') : event.body;
    const b = JSON.parse(raw);
    return b && typeof b === 'object' ? b : {};
  } catch { return null; }
}

// ── Sesión de admin: token firmado con HMAC, ligado a la ruleta y a su versión de sesión ──
const b64 = (s) => Buffer.from(s).toString('base64url');
function firmar(payload) {
  const p = b64(JSON.stringify(payload));
  const sig = crypto.createHmac('sha256', process.env.RULETA_SESSION_SECRET).update(p).digest('base64url');
  return `${p}.${sig}`;
}
async function crearToken(slug, version) {
  return firmar({ r: slug, v: version, exp: Date.now() + 12 * 3600 * 1000 });
}
/** Devuelve el id de la ruleta si el token es válido; si no, null. */
async function verificarAdmin(event) {
  const h = event.headers || {};
  const auth = h.authorization || h.Authorization || '';
  const m = auth.match(/^Bearer\s+([A-Za-z0-9_-]+)\.([A-Za-z0-9_-]+)$/);
  if (!m || !process.env.RULETA_SESSION_SECRET) return null;
  const esperado = crypto.createHmac('sha256', process.env.RULETA_SESSION_SECRET).update(m[1]).digest();
  const dado = Buffer.from(m[2], 'base64url');
  if (dado.length !== esperado.length || !crypto.timingSafeEqual(dado, esperado)) return null;
  let p;
  try { p = JSON.parse(Buffer.from(m[1], 'base64url').toString('utf8')); } catch { return null; }
  if (!p || p.r !== process.env.RULETA_SLUG || !(p.exp > Date.now())) return null;
  const [r] = await sql`SELECT id, sesion_version FROM ruletas.ruleta WHERE slug = ${p.r}`;
  if (!r || r.sesion_version !== p.v) return null;
  return r.id;
}
const noAutorizado = () => json(401, { success: false, message: 'Sesión vencida o no autorizada. Volvé a iniciar sesión.' });

async function evento(rid, tipo, detalle = {}, codigoId = null) {
  try {
    await sql`INSERT INTO ruletas.evento (ruleta_id, codigo_id, tipo, detalle) VALUES (${rid}, ${codigoId}, ${tipo}, ${JSON.stringify(detalle)}::jsonb)`;
  } catch (e) { console.error('evento', tipo, e.message); }
}

// ── Helpers de datos ──
const normCodigo = (c) => String(c == null ? '' : c).trim().toUpperCase();
function listaPremios(v) {
  if (!Array.isArray(v)) return null;
  const out = v.map((p) => String(p == null ? '' : p).trim()).filter((p) => p.length > 0);
  if (out.some((p) => p.length > 120)) return null;
  return out;
}
function codigoPublico(r) {
  return {
    codigoId: r.codigo,
    nombre: r.nombre_fan,
    premios: r.premios || [],
    usado: !!r.usado,
    tiradasTotales: r.tiradas_totales,
    tiradasRestantes: r.tiradas_restantes,
    expirado: !!r.expirado_at,
    creado: r.creado_at,
  };
}

/** Envuelve un handler: OPTIONS, método permitido y errores sin filtrar detalles internos. */
function handler(metodos, fn) {
  return async (event) => {
    if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: corsHeaders, body: '' };
    if (!metodos.includes(event.httpMethod)) return json(405, { success: false, message: 'Método no permitido' });
    try {
      return await fn(event);
    } catch (e) {
      console.error(e);
      return json(500, { success: false, message: 'Error interno del servidor. Probá de nuevo en un momento.' });
    }
  };
}

module.exports = {
  sql, json, corsHeaders, ruletaId, leerBody, crearToken, verificarAdmin, noAutorizado, evento,
  normCodigo, listaPremios, codigoPublico, handler,
};
