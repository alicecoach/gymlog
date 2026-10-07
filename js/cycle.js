// Seguimiento opcional del ciclo menstrual. Solo informa: nunca cambia la rutina ni los objetivos.
// Las fechas se guardan como 'AAAA-MM-DD' (día local) para no depender de la zona horaria.
const Cycle = (() => {
  const DAY = 864e5;
  const ENERGY = { 1: { icon: '😴', label: 'Sin pilas' }, 2: { icon: '😐', label: 'Normal' }, 3: { icon: '🙂', label: 'Bien' }, 4: { icon: '💪', label: '¡A tope!' } };
  const PHASES = {
    menstrual: { label: 'menstrual', icon: '🌑',
      note: 'Hay días de regla en los que apetece todo y otros en los que no: las dos cosas son normales. Moverte suele aliviar el dolor y subir el ánimo.',
      tips: ['Si hay dolor, alarga el calentamiento y añade movilidad suave de cadera.', 'Hierro en el plato: legumbres, carne roja, mejillones o espinacas, con algo de vitamina C.',
        'Agua a mano: hidratarte bien también es rendimiento.', 'Si hoy te sientes fuerte, entrena como siempre. Si no, el RIR se encarga de ajustar.'] },
    folicular: { label: 'folicular', icon: '🌒',
      note: 'Mucha gente nota la energía al alza estos días. Si es tu caso, ¡aprovecha para apretar en tus básicos!',
      tips: ['¿Tienes una subida de peso pendiente? Si el cuerpo te lo pide, este puede ser un buen momento.', 'Buena recuperación entre sesiones: aun así, el sueño sigue mandando.',
        'Si te notas con chispa, prueba a completar el rango alto de reps antes de subir.'] },
    ovulatoria: { label: 'ovulatoria', icon: '🌕',
      note: 'Hay quien se siente en su mejor momento y quien no nota nada especial. Ambas cosas son normales.',
      tips: ['Calienta bien antes de las cargas altas: articulaciones y técnica primero.', 'Controla la bajada y no rebotes abajo en sentadillas o peso muerto.',
        'Si hoy vuelas, ¡a por ello! Solo cuida la técnica en la última serie.'] },
    lutea: { label: 'lútea', icon: '🌗',
      note: 'Algunas personas notan más calor, más hambre o algo menos de chispa, sobre todo al final. Otras baten récords. Tu RIR ya ajusta la carga a cómo estés hoy.',
      tips: ['La retención de líquidos puede mover la báscula 1–2 kg: no es grasa, no te agobies.', 'Si notas más hambre, tira de proteína y verdura para saciarte.',
        'La temperatura corporal sube un poco: agua a mano y, si puedes, zona ventilada.', 'Dormir bien estos días marca la diferencia en cómo rindes.'] },
  };
  const ORDER = ['menstrual', 'folicular', 'ovulatoria', 'lutea'];

  const S = () => Store.get().cycle;
  const pad = n => String(n).padStart(2, '0');
  const ymd = (ts = Date.now()) => { const d = new Date(ts); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
  const dayNum = s => { const [y, m, d] = s.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / DAY); };
  const fmt = s => new Date(dayNum(s) * DAY).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  const starts = () => S().starts.slice().sort();

  // Duración media con los últimos 6 ciclos plausibles (21–45 días); 28 si aún no hay datos.
  function avgLength() {
    const st = starts(), gaps = [];
    for (let i = 1; i < st.length; i++) gaps.push(dayNum(st[i]) - dayNum(st[i - 1]));
    const ok = gaps.filter(g => g >= 21 && g <= 45).slice(-6);
    return ok.length ? Math.round(ok.reduce((a, b) => a + b, 0) / ok.length) : 28;
  }
  // Ovulación estimada a 14 días del final: la fase lútea varía poco, la folicular mucho.
  function phaseOf(day, len) {
    const ov = Math.max(10, len - 14);
    if (day <= 5) return 'menstrual';
    if (day < ov - 1) return 'folicular';
    if (day <= ov + 1) return 'ovulatoria';
    return 'lutea';
  }
  // Situación en una fecha. null si no hay seguimiento o datos (o son demasiado antiguos).
  function at(ts = Date.now()) {
    const c = S();
    if (!c.enabled) return null;
    const today = dayNum(ymd(ts)), prev = starts().filter(s => dayNum(s) <= today).pop();
    if (!prev) return null;
    const day = today - dayNum(prev) + 1, len = avgLength();
    if (day > 90) return null;
    const noPhase = c.hormonal || c.irregular;
    return { day, len, start: prev, phase: noPhase ? null : phaseOf(Math.min(day, len), len), due: day >= len - 1, late: day > len + 7 };
  }
  const label = st => st.phase ? `Día ${st.day} · fase ${PHASES[st.phase].label}` : `Día ${st.day} del ciclo`;
  const tip = phase => { const t = PHASES[phase].tips; return t[Math.floor(Date.now() / DAY) % t.length]; };

  // Anota un inicio de regla. Si hay otro a menos de 7 días, lo sustituye (corrección).
  function addStart(date) {
    const c = S(), near = c.starts.find(s => s !== date && Math.abs(dayNum(s) - dayNum(date)) < 7);
    if (near && !confirm(`Ya tienes anotado el ${fmt(near)}. ¿Sustituirlo por el ${fmt(date)}?`)) return false;
    c.starts = [...new Set(c.starts.filter(s => s !== near).concat(date))].sort();
    Store.save();
    return true;
  }
  function removeStart(date) { S().starts = S().starts.filter(s => s !== date); Store.save(); }

  // Tu patrón real: energía media y récords por fase, con tus entrenos valorados.
  function pattern() {
    const res = Object.fromEntries(ORDER.map(p => [p, { n: 0, sum: 0, prs: 0 }]));
    const best = {};
    Store.get().workouts.slice().sort((a, b) => a.start - b.start).forEach(w => {
      const st = at(w.start), r = st?.phase && res[st.phase];
      let prs = 0;
      if (!['hiit', 'descarga'].includes(w.type)) w.exercises.forEach(e => {
        const v = Progression.bestE1rm(e.sets);
        if (best[e.exId] && v > best[e.exId]) prs++;
        best[e.exId] = Math.max(best[e.exId] || 0, v);
      });
      if (!r) return;
      r.prs += prs;
      if (w.energy) { r.n++; r.sum += w.energy; }
    });
    const rated = ORDER.reduce((a, p) => a + res[p].n, 0);
    ORDER.forEach(p => { res[p].avg = res[p].n ? res[p].sum / res[p].n : 0; });
    return { phases: res, rated, ready: starts().length >= 3 && rated >= 4 };
  }

  const reset = () => { Object.assign(S(), { starts: [], hormonal: false, irregular: false, share: false }); Store.save(); };

  return { ENERGY, PHASES, ORDER, ymd, fmt, starts, avgLength, at, label, tip, addStart, removeStart, pattern, reset };
})();
