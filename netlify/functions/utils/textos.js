// Mensajes que ve el FAN (las ruletas en inglés los muestran traducidos). El admin queda en español.
const T = {
  es: {
    requerido: 'El campo codigoId es requerido.',
    noEncontrado: 'Código no encontrado',
    usado: 'Este código ya ha sido utilizado o no tiene tiradas disponibles',
    sinTiradas: 'No quedan tiradas disponibles',
    todosGanados: '¡Ya has ganado todos los premios disponibles! 🎉',
    fueraDeRueda: 'Error de configuración. Por favor, avisa a la modelo.',
    solicitud: 'Solicitud inválida. Recargá la página e intentá de nuevo.',
    recargar: 'La ruleta se actualizó. Recargá la página para seguir jugando.',
  },
  en: {
    requerido: 'The codigoId field is required.',
    noEncontrado: 'Code not found',
    usado: 'This code has already been used or has no spins left',
    sinTiradas: 'No spins left',
    todosGanados: "You've already won all available prizes! 🎉",
    fueraDeRueda: 'Configuration error. Please let the model know.',
    solicitud: 'Invalid request. Please reload the page and try again.',
    recargar: 'The wheel was updated. Please reload the page to keep playing.',
  },
};
module.exports = (idioma) => T[idioma === 'en' ? 'en' : 'es'];
