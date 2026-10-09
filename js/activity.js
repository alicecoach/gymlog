// Actividad fuera del gimnasio: correr, pádel, bici… Se guardan aparte de los entrenos (state.activities)
// para no mezclarse con series, kilos, récords ni la racha semanal de entrenos.
const Activity = (() => {
  // met: gasto aproximado (MET) por esfuerzo suave / moderado / intenso. dist: se anota la distancia.
  const TYPES = {
    correr: { icon: '🏃', label: 'Correr', dist: true, met: [7, 9.8, 11.5] },
    caminar: { icon: '🥾', label: 'Caminar / senderismo', dist: true, met: [3.5, 4.3, 6] },
    bici: { icon: '🚴', label: 'Bici', dist: true, met: [5.8, 8, 10] },
    nadar: { icon: '🏊', label: 'Nadar', dist: true, met: [6, 8, 10] },
    padel: { icon: '🎾', label: 'Pádel', met: [5, 6, 7.5] },
    tenis: { icon: '🏸', label: 'Tenis / bádminton', met: [5, 7, 8] },
    equipo: { icon: '⚽', label: 'Deporte de equipo', met: [5, 7, 9] },
    clase: { icon: '🤸', label: 'Clase dirigida', met: [5, 6.5, 8] },
    yoga: { icon: '🧘', label: 'Yoga / pilates', met: [2.5, 3, 4] },
    baile: { icon: '💃', label: 'Baile', met: [4.5, 6, 7.5] },
    escalada: { icon: '🧗', label: 'Escalada', met: [5, 7, 8] },
    otra: { icon: '✨', label: 'Otra', met: [3, 5, 7] },
  };
  const EFFORT = { 1: { icon: '🙂', label: 'Suave' }, 2: { icon: '😅', label: 'Moderado' }, 3: { icon: '🥵', label: 'Intenso' } };

  const list = () => Store.get().activities || (Store.get().activities = []);
  const type = a => TYPES[a.type] || TYPES.otra;
  const title = a => a.name || type(a).label;
  // Kcal: las del reloj si las hay; si no, MET × peso × horas (necesita el peso en Ajustes).
  function kcal(a) {
    if (Number(a.kcal) > 0) return { v: Number(a.kcal), est: false };
    const kg = Number(Store.get().settings.bodyweight);
    if (!kg || !a.mins) return null;
    return { v: Math.round(type(a).met[(a.effort || 2) - 1] * kg * a.mins / 60), est: true };
  }
  // Ritmo de carrera (min/km) o velocidad (km/h) cuando hay distancia.
  function pace(a) {
    const km = Number(a.km);
    if (!km || !a.mins) return '';
    if (a.type === 'correr' || a.type === 'caminar') {
      const p = a.mins / km, m = Math.floor(p), s = Math.round((p - m) * 60);
      return `${s === 60 ? m + 1 : m}:${String(s === 60 ? 0 : s).padStart(2, '0')} min/km`;
    }
    return `${(km / (a.mins / 60)).toLocaleString('es-ES', { maximumFractionDigits: 1 })} km/h`;
  }
  const between = (a, b) => list().filter(x => x.start >= a && x.start < b).sort((x, y) => x.start - y.start);

  return { TYPES, EFFORT, list, type, title, kcal, pace, between };
})();
