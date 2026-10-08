(() => {
  const $app = document.getElementById('app');
  const S = () => Store.get();
  const save = () => Store.save();
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const fmtDate = ts => new Date(ts).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' });
  const fmtDur = ms => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} h ${m % 60} min` : `${m} min`; };
  const fmtRest = s => s >= 60 ? `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}` : `${s}s`;
  const fmtNum = n => Number(n).toLocaleString('es-ES', { maximumFractionDigits: 1 });
  const go = hash => { location.hash = hash; };
  const ui = { q: '', brand: 'all', muscle: 'all', load: 'all', samePattern: true };
  let justDone = null; // serie recién marcada, para animarla
  let swapOpen = null; // ejercicio del entreno con el panel de alternativas abierto
  let holdOn = null;   // serie por tiempo con la cuenta atrás en marcha ("ei-si")
  let memoOpen = null; // ejercicio del entreno con el panel de molestias/anotación abierto
  let demoOpen = null; // ejercicio del entreno con la ilustración de técnica abierta
  let celebrate = null; // id del entreno recién terminado, para lanzar el confeti una sola vez

  const TIPS = [
    'Proteína: apunta a 1,6–2,2 g por kg de peso corporal al día.',
    'En recomposición, si tus cargas suben mientras bajas grasa, vas por buen camino.',
    'Déficit moderado (300–500 kcal): suficiente para perder grasa sin hundir tu rendimiento.',
    'Muévete fuera del gym: 8.000–10.000 pasos diarios suman más de lo que parece.',
    'Dormir 7–9 horas también es entrenar.',
    'Entrena cerca del fallo (RIR 1–3). En los básicos no hace falta llegar al fallo en cada serie.',
    'Si te estancas en varios ejercicios a la vez, toca una semana de descarga.',
    'Controla la fase excéntrica (2–3 s): más tensión, menos lesiones.',
  ];
  // Novedades: al publicar una mejora, añade una entrada arriba con un número mayor. Se enseña una vez por perfil.
  const NEWS = [
    { v: 6, date: '2026-10-08', items: [
      '🎬 <b>Cómo se hace</b>: unos 140 ejercicios traen una ilustración animada de la técnica (posición inicial y final). Está en su ficha y, durante el entreno, en «🎬 Cómo se hace».',
      '▶️ Y en <b>todos</b> los ejercicios, un enlace para ver vídeos de la técnica.',
    ] },
    { v: 5, date: '2026-10-08', items: [
      '🏠 <b>Full body sin material</b>: nuevo entreno rápido de calistenia (~35 min) para casa, el parque o de viaje.',
      '📈 En los ejercicios sin peso, cuando llegues al tope de reps la app te propone ponerlo más difícil (tempo, pausa o variante) en vez de subir kilos.',
    ] },
    { v: 4, date: '2026-10-08', items: [
      '💪 <b>Más ejercicios</b>: fondos en banco y en máquina, press francés, flexiones diamante, planchas sobre antebrazo, silla romana…',
      '⛔ ¿Alguno no te va bien? En su ficha, <b>Evitar este ejercicio</b>: no te saldrá en rutinas generadas, alternativas, entrenos rápidos ni en el core del final.',
    ] },
    { v: 3, date: '2026-10-08', items: [
      '📈 <b>Progreso por grupo muscular</b> en Historial: series por semana y fuerza de glúteo, espalda, pecho…',
      '🏋️ <b>Más de 100 ejercicios nuevos</b> con mancuernas, kettlebell, banco, goma y sin material para todos los grupos.',
      '🎯 <b>Core</b>: russian twist, sit-ups con peso, inclinación lateral con kettlebell, leñador, hollow hold y muchos más. El remate de core va rotando: uno frontal, uno de rotación y uno lateral.',
      '🐾 <b>Animal Flow y movilidad</b>: nuevo entreno rápido de ~20 min sin material, y Animal Flow también en Potencia.',
      '💡 <b>Consejos de uso</b> en ⚙️ Ajustes para sacarle partido a la app.',
    ] },
    { v: 2, date: '2026-10-08', items: [
      '🛟 <b>Comodines de racha</b>: 2 al mes. Si una semana no llegas, tu racha sigue.',
      '🏅 <b>Medallas</b> por constancia, récords y kilos. Míralas tocando tu racha en Inicio.',
      '🎉 Confeti al batir un récord, cumplir la semana o ganar una medalla.',
    ] },
    { v: 1, date: '2026-10-08', items: [
      '🔥 <b>Series de aproximación</b> en los básicos (50 % × 8 y 75 % × 4).',
      '📝 <b>Molestias y notas</b> por ejercicio: te lo recuerda la próxima vez.',
      '📈 Gráfica de 1RM estimado en la ficha de cada ejercicio.',
      '📅 Racha semanal y resumen de cada mes.',
    ] },
  ];
  const newsHTML = list => list.map(n => `<div class="news-block"><small class="muted">${Cycle.fmt(n.date)}</small><ul>${n.items.map(i => `<li>${i}</li>`).join('')}</ul></div>`).join('');
  // Solo a quien ya usaba la app: un perfil nuevo empieza con todo visto.
  function checkNews() {
    const st = S().settings, top = NEWS[0].v;
    if ((st.seenNews || 0) >= top) return;
    // Sin registro previo (perfiles de antes de este aviso): solo lo último.
    const fresh = st.seenNews === undefined ? NEWS.slice(0, 1) : NEWS.filter(n => n.v > st.seenNews);
    if (!S().workouts.length) { st.seenNews = top; save(); return; }
    const bg = document.createElement('div');
    bg.className = 'sheet-bg';
    bg.innerHTML = `<div class="sheet" role="dialog" aria-label="Novedades"><div class="sheet-ic">✨</div><h2>Novedades en GymLog</h2>
      ${newsHTML(fresh.slice(0, 2))}<button class="btn primary block" data-act="news-ok">¡Genial!</button></div>`;
    document.body.appendChild(bg);
    requestAnimationFrame(() => bg.classList.add('show'));
  }

  // Consejos de uso, en Ajustes.
  const HOWTO = [
    ['📲', 'Instálala', 'En Chrome, menú ⋮ → «Añadir a pantalla de inicio». Funciona sin conexión en el gimnasio.'],
    ['✅', 'Marca cada serie', 'Al tocar ✓ arranca el descanso y la app aprende: la próxima vez te propone peso y reps.'],
    ['📈', 'Sigue la sugerencia', 'Doble progresión: cuando llegas al tope de reps en todas las series, toca subir peso. Si te estancas, te avisa.'],
    ['🎯', 'Anota el RIR', 'Las reps que te quedaban en la recámara. Con él las sugerencias se ajustan mejor a ti.'],
    ['⇄', '¿Máquina ocupada?', 'Toca ⇄ en el ejercicio: alternativas que trabajan lo mismo, solo para hoy.'],
    ['📝', 'Molestias y notas', 'Toca 📝 en el ejercicio para marcar una molestia o apuntar un ajuste. Te lo recuerda la próxima vez.'],
    ['⚖️', 'Cómo anotas el peso', 'En la ficha de cada ejercicio: por lado, total o por mancuerna, y la subida mínima de esa máquina.'],
    ['🎬', 'Cómo se hace', 'Toca «🎬 Cómo se hace» en el entreno o abre la ficha del ejercicio: ilustración de la técnica y vídeos.'],
    ['📷', 'Foto de tu máquina', 'Desde su ficha: la reconoces de un vistazo durante el entreno.'],
    ['⚡', 'Entrenos rápidos', 'Para días raros: full body, full body sin material (calistenia), HIIT, potencia, movilidad y Animal Flow, o una descarga.'],
    ['📅', '¿Se te olvidó anotar?', 'Historial → «Registrar un entreno de otro día». Desde cada resumen puedes corregir pesos y fechas.'],
    ['💪', 'Mira tu volumen', 'En Historial: series por músculo de la semana y el progreso de cada grupo muscular.'],
    ['🔥', 'Racha y comodines', 'Cumple tus días por semana. Tienes 2 comodines al mes para las semanas complicadas.'],
    ['💾', 'Copia de seguridad', 'Tus datos viven solo en este móvil. Exporta una vez al mes y guárdala en Drive.'],
    ['⛔', 'Ejercicios a evitar', 'Si uno no te va bien (lesión, molestia), en su ficha toca «Evitar»: no te saldrá en rutinas generadas, alternativas ni entrenos rápidos.'],
    ['👥', 'Varias personas', 'Toca tu avatar arriba para añadir a otra persona: cada una con sus rutinas e historial.'],
  ];

  // Remate de core: uno de cada tipo (flexión / anti-extensión, rotación / anti-rotación, lateral), rotando entre entrenos.
  // Respeta los ejercicios que cada perfil marca como ⛔ Evitar (p. ej. planchas sobre antebrazos).
  const CORE = [
    ['g-dead-bug', 'g-cable-crunch', 'g-reverse-crunch', 'g-weighted-situp', 'g-high-plank', 'hss-ab-crunch', 'g-hollow', 'g-plank', 'af-beast-hold', 'g-bird-dog'],
    ['g-pallof', 'g-russian-twist', 'g-cable-woodchop', 'g-bicycle', 'g-cable-pallof', 'af-side-kick'],
    ['g-kb-side-bend', 'g-side-plank-hand', 'g-suitcase-carry', 'g-side-plank', 'g-heel-touch', 'g-db-side-bend'],
  ];

  // ---------- helpers de datos ----------
  const activeRoutine = () => S().routines.find(r => r.id === S().activeRoutineId) || null;
  const routineById = id => S().routines.find(r => r.id === id);
  const doneSets = w => w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done !== false).length, 0);
  const excluded = () => S().profile?.excluded || [];
  // Tren superior o inferior según dónde caen las series (el core no cuenta).
  const LOWER = ['Cuádriceps', 'Isquios', 'Glúteo', 'Gemelos', 'Aductores'], NEUTRAL = ['Abdomen', 'Lumbar'];
  function regionOf(items) {
    let lo = 0, up = 0;
    items.forEach(([exId, n]) => Store.exercise(exId).primary.forEach(m => {
      if (LOWER.includes(m)) lo += n; else if (!NEUTRAL.includes(m)) up += n;
    }));
    if (!lo && !up) return null;
    return lo >= up * 2 ? 'lower' : up >= lo * 2 ? 'upper' : 'full';
  }
  const dayRegion = d => regionOf(d.exercises.map(x => [x.exId, Number(x.sets) || 1]));
  const workoutRegion = w => ['hiit', 'potencia', 'movilidad'].includes(w.type) ? null : regionOf(w.exercises.map(e => [e.exId, e.sets.length]));
  const lastDone = (r, i) => S().workouts.filter(w => w.routineId === r.id && w.dayIndex === i).reduce((a, w) => Math.max(a, w.start), 0);
  const startOfDay = ts => new Date(ts).setHours(0, 0, 0, 0);
  const daysAgo = ts => Math.round((startOfDay(Date.now()) - startOfDay(ts)) / 864e5);
  const agoTxt = ts => { const n = daysAgo(ts); return n === 0 ? 'hoy' : n === 1 ? 'ayer' : `hace ${n} días`; };
  // Qué día toca: alterna tren superior e inferior respecto al último entreno (sea de la rutina o rápido)
  // y, dentro de esa zona, el día que hace más tiempo que no haces.
  function nextDayIndex(r) {
    if (!r.days.length) return 0;
    const days = r.days.map((d, i) => ({ i, region: dayRegion(d), last: lastDone(r, i) }));
    const lastW = S().workouts.filter(w => workoutRegion(w)).sort((a, b) => b.start - a.start)[0];
    const prev = lastW && workoutRegion(lastW);
    let pool = days;
    if (prev === 'upper' || prev === 'lower') {
      const want = days.filter(x => x.region === (prev === 'upper' ? 'lower' : 'upper'));
      if (want.length) pool = want;
    }
    return pool.slice().sort((a, b) => a.last - b.last || a.i - b.i)[0].i;
  }
  const trainedToday = () => S().workouts.some(w => daysAgo(w.start) === 0);
  // Técnica: ilustración animada (inicio ↔ final) si la hay, y búsqueda de vídeo para cualquier ejercicio.
  function demoHTML(exId) {
    const ek = DEMOS[exId];
    return ek ? `<div class="demo" role="img" aria-label="Cómo se hace: posición inicial y final"><img src="img/ek/${ek}-a.png" alt="" loading="lazy"><img class="b" src="img/ek/${ek}-b.png" alt="" loading="lazy"></div>
      <small class="demo-credit">Ilustración: <a href="https://github.com/everkinetic/data" target="_blank" rel="noopener">Everkinetic</a> · CC BY-SA 4.0</small>` : '';
  }
  function videoLink(exId) {
    const ex = Store.exercise(exId), q = `${ex.name}${ex.line === 'Animal Flow' ? ' animal flow' : ex.brand && ex.brand !== 'Genérico' ? ' ' + ex.brand : ''} técnica`;
    return `<a class="btn small ghost" href="https://www.youtube.com/results?search_query=${encodeURIComponent(q)}" target="_blank" rel="noopener">▶️ Ver vídeos de la técnica</a>`;
  }
  function thumb(exId, cls = '') {
    const p = S().photos[exId];
    return p ? `<div class="pict photo ${cls}"><img src="${p}" alt=""></div>` : Icons.tile(Store.exercise(exId).pattern, cls);
  }
  const workoutIcon = w => w.icon || routineById(w.routineId)?.days[w.dayIndex]?.icon || '🏋️';

  function toast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(toast.t);
    toast.t = setTimeout(() => t.classList.remove('show'), 2600);
  }

  function newWorkoutEx(exId, target, ref = {}, deload = false) {
    const { label, mode } = Store.exSettings(exId);
    if (mode === 'tiempo' || mode === 'goma') {
      const sug = Progression.suggest(exId, target);
      if (sug.type === 'first' && ref.band) { sug.band = ref.band; sug.msg = `Referencia: goma ${BANDS[ref.band]?.label.toLowerCase()}. Ajústala si no encaja con ${target.repMin}–${target.repMax} reps.`; }
      if (deload) sug.msg = mode === 'tiempo' ? `Descarga: ${target.sets} series suaves, sin apurar.` : `Descarga: misma goma, ${target.sets} series y deja ${target.rir} reps en reserva.`;
      return { exId, target, suggestion: sug, note: ref.note || '', superset: !!ref.superset,
        sets: Array.from({ length: Number(target.sets) || 3 }, () => mode === 'tiempo'
          ? { secs: sug.secs || Number(target.secs) || 30, kg: '', reps: '', rir: '', done: false }
          : { band: sug.band || '', kg: '', reps: '', rir: '', done: false }) };
    }
    const sug = deload ? { type: 'deload', kg: ref.kg ?? null, reps: target.repMin } : Progression.suggest(exId, target);
    if (deload) {
      sug.msg = `Descarga: ${ref.kg !== '' && ref.kg != null ? `${fmtNum(ref.kg)} ${label}, ` : ''}${target.sets} series y deja ${target.rir} reps en reserva.`;
    } else if (sug.type === 'first' && ref.kg !== '' && ref.kg != null) {
      // Sin historial: usa el peso de referencia de la rutina, si lo hay.
      sug.kg = Number(ref.kg);
      sug.msg = `Referencia: ${fmtNum(sug.kg)} ${label}. Ajústalo si hoy no encaja con ${target.repMin}–${target.repMax} reps a RIR ${target.rir}.`;
    }
    const ex = {
      exId, target, suggestion: sug, note: ref.note || '', superset: !!ref.superset,
      sets: Array.from({ length: Number(target.sets) || 3 }, () => ({ kg: sug.kg ?? '', reps: '', rir: '', done: false })),
    };
    if (Store.exSettings(exId).warmup) ex.warmup = WARMUP.map(x => ({ pct: x.pct, reps: x.reps, kg: '', done: false }));
    return ex;
  }
  // Series de aproximación: no cuentan como volumen ni para la progresión, pero sí en los kilos totales.
  const WARMUP = [{ pct: 50, reps: 8 }, { pct: 75, reps: 4 }];
  // Peso de una serie de aproximación: % del peso de trabajo de hoy, redondeado al salto de la máquina.
  function warmupKg(e, s) {
    if (s.done) return Number(s.kg) || 0;
    const work = Number(e.sets[0]?.kg) || Number(e.suggestion?.kg) || 0, inc = Number(Store.exSettings(e.exId).increment) || 2.5;
    return work ? Math.max(0, Math.round(work * s.pct / 100 / inc) * inc) : 0;
  }
  const PAIN = { codo: 'Codo', hombro: 'Hombro', cervical: 'Cervical', lumbar: 'Lumbar', rodilla: 'Rodilla', muneca: 'Muñeca' };
  const painTxt = keys => keys.map(k => PAIN[k] || k).join(', ').toLowerCase();
  function confirmReplace() {
    return !S().activeWorkout || confirm('Ya tienes un entreno en curso. ¿Descartarlo y empezar otro?');
  }
  // past = { start, mins }: entreno de otro día que se anota a posteriori (sin cronómetro ni descansos).
  function startWorkout(dayIdx, past) {
    const r = activeRoutine();
    if (!r || !confirmReplace()) return;
    const d = r.days[dayIdx];
    S().activeWorkout = {
      id: Store.uid(), type: 'rutina', routineId: r.id, dayIndex: dayIdx, dayName: d.name, icon: d.icon, start: past ? past.start : Date.now(),
      exercises: d.exercises.map(x => newWorkoutEx(x.exId, { sets: x.sets, repMin: x.repMin, repMax: x.repMax, rir: x.rir, rest: x.rest, secs: x.secs }, x)),
    };
    if (past) S().activeWorkout.past = past.mins;
    save();
    go('#/entreno');
  }
  function startPast(el) {
    const date = document.getElementById('p-date').value, time = document.getElementById('p-time').value || '18:00';
    const mins = Number(document.getElementById('p-mins').value) || 45;
    const start = new Date(`${date}T${time}`).getTime();
    if (!date || !(start < Date.now())) return toast('Elige una fecha y hora que ya hayan pasado.');
    if (el.dataset.day !== undefined) return startWorkout(Number(el.dataset.day), { start, mins });
    if (!confirmReplace()) return;
    S().activeWorkout = { id: Store.uid(), type: 'libre', icon: '🏋️', dayName: 'Entreno libre', start, past: mins, exercises: [] };
    save();
    go('#/elegir/workout/0');
  }
  function startQuick(type) {
    const r = activeRoutine(), next = r ? nextDayIndex(r) : 0, T = Quick.TYPES[type];
    if (type === 'descarga' && !r) return toast('Para la descarga necesitas una rutina activa.');
    if (!confirmReplace()) return;
    const items = Quick.build(type, r, next);
    const w = { id: Store.uid(), type, icon: T.icon, dayName: T.label, start: Date.now(), exercises: [] };
    if (type === 'descarga') Object.assign(w, { routineId: r.id, dayIndex: next, dayName: `Descarga · ${r.days[next].name}` });
    if (type === 'hiit') {
      w.hiit = Object.assign({}, Quick.HIIT);
      w.exercises = items.map(it => ({ exId: it.exId, target: it.target, note: it.ref.note || '',
        sets: Array.from({ length: w.hiit.rounds }, () => ({ kg: 0, reps: 0, secs: w.hiit.work, done: false })) }));
    } else {
      w.exercises = items.map(it => newWorkoutEx(it.exId, it.target, it.ref, it.deload));
    }
    S().activeWorkout = w;
    save();
    go('#/entreno');
  }

  // ---------- vistas ----------
  function viewHome() {
    const s = S(), r = activeRoutine(), u = Store.currentUser();
    let h = `<p class="hello">Hola, <b>${esc(u.name)}</b> ${u.avatar}</p>` + cycleChip() + streakCard();
    if (backupDue()) {
      h += `<div class="card backup"><b>💾 Toca la copia de seguridad del mes</b>
        <small>Tu historial solo vive en este móvil. Guárdala en Drive o envíatela: con una vez al mes basta.</small>
        <div class="row gap"><button class="btn small primary" data-act="export">Guardar copia</button><button class="btn small ghost" data-act="backup-later">Este mes no</button></div></div>`;
    }
    // Los primeros días de cada mes, el resumen del mes anterior.
    const lastM = shiftMonth(monthKey(Date.now()), -1);
    if (new Date().getDate() <= 7 && monthStats(lastM).ws.length) {
      h += `<a class="card row between nudge month-nudge" href="#/mes/${lastM}"><div class="grow"><b>📅 Tu resumen de ${monthName(lastM)} está listo</b>
        <small>Kilos, récords y tus días entrenados</small></div><span class="chev">›</span></a>`;
    }
    if (s.activeWorkout) {
      h += `<a class="card live" href="#/entreno"><span class="pulse"></span><div class="grow"><b>Entreno en curso</b>
        <small>${esc(s.activeWorkout.dayName)} · ${s.activeWorkout.past ? `📅 del ${fmtDate(s.activeWorkout.start)}` : `hace ${fmtDur(Date.now() - s.activeWorkout.start)}`}</small></div><span class="chev">›</span></a>`;
    }
    if (!r) {
      h += `<div class="card hero"><h2>Empecemos 💪</h2>
        <p>Genera una rutina según tu objetivo y las máquinas de tu gimnasio, o carga una predefinida en Rutinas.</p>
        <a class="btn primary" href="#/generar">Crear mi rutina</a></div>`;
    } else {
      const next = nextDayIndex(r), nextTxt = trainedToday() ? 'el próximo' : 'te toca hoy';
      h += `<div class="section-head"><h2>${esc(r.name)}</h2><a class="link" href="#/rutina/${r.id}">Editar</a></div>`;
      r.days.forEach((d, i) => {
        const last = lastDone(r, i);
        h += `<div class="card day ${i === next ? 'next' : ''}"><div class="day-ic">${d.icon || '🏋️'}</div>
          <div class="grow"><b>${esc(d.name)}</b><small>${d.exercises.length} ejercicios · ${last ? agoTxt(last) : 'sin hacer aún'}${i === next ? ` · <span class="hl">${nextTxt}</span>` : ''}</small></div>
          <button class="play ${i === next ? 'on' : ''}" data-act="start" data-day="${i}" aria-label="Empezar ${esc(d.name)}">▶</button></div>`;
      });
    }
    h += `<div class="section-head"><h2>Entreno rápido</h2><small>para días especiales</small></div><div class="quick">` +
      Object.entries(Quick.TYPES).map(([k, t]) => `<button class="qcard g-${t.grad}" data-act="quick" data-type="${k}">
        <span class="qi">${t.icon}</span><b>${t.label}</b><small>${t.desc}</small></button>`).join('') + '</div>';

    const weekAgo = Date.now() - 7 * 864e5;
    const wk = s.workouts.filter(w => w.start > weekAgo);
    const kgWeek = wk.reduce((a, w) => a + Nutrition.lifted(w), 0);
    h += `<div class="stats"><div><b>${wk.length}</b><small>entrenos · 7 días</small></div>
      <div><b>${wk.reduce((a, w) => a + doneSets(w), 0)}</b><small>series · 7 días</small></div>
      <div><b>${kgWeek >= 1000 ? fmtNum(kgWeek / 1000) + ' t' : Math.round(kgWeek) + ' kg'}</b><small>levantado · 7 días</small></div></div>`;
    if (!Nutrition.energy()) {
      h += `<a class="card row between nudge" href="#/ajustes"><div class="grow"><b>📏 Completa tus datos</b>
        <small>Sexo, edad, peso y altura para calcular tus calorías y proteína.</small></div><span class="chev">›</span></a>`;
    }

    if (r) {
      // Aviso de descarga si varios ejercicios están estancados.
      const stalled = new Set();
      r.days.forEach(d => d.exercises.forEach(x => {
        const t = Progression.suggest(x.exId, x).type;
        if (t === 'stall' || t === 'down') stalled.add(x.exId);
      }));
      if (stalled.size >= 3) {
        h += `<div class="card warn"><b>🔋 Plantéate una semana de descarga</b>
          <p>${stalled.size} ejercicios estancados. Una semana suave suele desbloquear el progreso.</p>
          <button class="btn small" data-act="quick" data-type="descarga">Empezar descarga</button></div>`;
      }
    }
    return h + `<div class="card tip">💡 ${TIPS[Math.floor(Date.now() / 864e5) % TIPS.length]}</div>`;
  }

  // ---------- constancia: racha semanal ----------
  // Semana de lunes a domingo. Cuenta días distintos con entreno; se cumple al llegar a tus días por semana.
  const weekStart = ts => { const d = new Date(startOfDay(ts)); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getTime(); };
  const addWeeks = (ts, n) => { const d = new Date(ts); d.setDate(d.getDate() + 7 * n); return d.getTime(); };
  const weekGoal = () => Number(S().profile?.days) || activeRoutine()?.days.length || 3;
  function weekDays(until = Infinity) {
    const by = {};
    S().workouts.filter(w => w.start <= until).forEach(w => { const k = weekStart(w.start); (by[k] = by[k] || new Set()).add(startOfDay(w.start)); });
    return k => by[k]?.size || 0;
  }
  // Comodines: cada mes hay 2. Si una semana ya terminada no llega al objetivo, se gasta uno solo y la racha
  // sigue (esa semana no suma). La semana en curso no rompe la racha: suma cuando la cumples.
  const JOKERS = 2;
  const weekMonth = k => monthKey(k + 3 * 864e5); // el mes de la semana es el de su jueves
  function streakTimeline() {
    const goal = weekGoal(), now = weekStart(Date.now()), ws = S().workouts.slice().sort((a, b) => a.start - b.start);
    const days = {}, doneAt = {};
    ws.forEach(w => {
      const k = weekStart(w.start), d = startOfDay(w.start);
      (days[k] = days[k] || new Set()).add(d);
      if (days[k].size === goal && !doneAt[k]) doneAt[k] = w.start; // el entreno que completó la semana
    });
    const cnt = k => days[k]?.size || 0, used = {}, weeks = [];
    let run = 0, best = 0;
    if (ws.length) for (let k = weekStart(ws[0].start); k <= now; k = addWeeks(k, 1)) {
      const m = weekMonth(k);
      if (cnt(k) >= goal) { run++; weeks.push({ k, run, done: true, at: doneAt[k] }); }
      else if (k === now) weeks.push({ k, run, current: true });
      else if (run && (used[m] || 0) < JOKERS) { used[m] = (used[m] || 0) + 1; weeks.push({ k, run, saved: true }); }
      else { run = 0; weeks.push({ k, run }); }
      best = Math.max(best, run);
    }
    return { weeks, cur: run, best, goal, week: cnt(now), jokersLeft: JOKERS - (used[weekMonth(now)] || 0) };
  }
  const streak = streakTimeline;
  function weeksInMonth(m) {
    const [a, b] = monthRange(m);
    let n = 0;
    for (let k = addWeeks(weekStart(a), -1); k < b; k = addWeeks(k, 1)) if (weekMonth(k) === m) n++;
    return n;
  }
  function streakCard() {
    if (!S().workouts.length) return '';
    const s = streak(), done = s.week >= s.goal, lastW = s.weeks[s.weeks.length - 2];
    const dots = Array.from({ length: Math.max(s.goal, s.week) }, (_, i) => `<i class="${i < s.week ? 'on' : ''}"></i>`).join('');
    const title = s.cur ? `${s.cur} ${s.cur === 1 ? 'semana' : 'semanas'} seguidas` : 'Empieza tu racha';
    const sub = done ? '✅ Semana cumplida' : lastW?.saved && s.week === 0 ? '🛟 Un comodín salvó la semana pasada' : `${s.week} de ${s.goal} esta semana`;
    const m = medals();
    return `<a class="card streak ${s.cur ? 'lit' : ''}" href="#/logros"><div class="flame">${s.cur ? '🔥' : '🌱'}</div><div class="grow"><b>${title}</b>
      <small>${sub}${s.best > s.cur ? ` · récord: ${s.best}` : s.cur >= 2 ? ' · ¡tu mejor racha!' : ''}</small>
      <small class="streak-meta"><span class="jokers">${'🛟'.repeat(Math.max(0, s.jokersLeft))}<s>${'🛟'.repeat(JOKERS - Math.max(0, s.jokersLeft))}</s></span> · 🏅 ${m.count}/${MEDALS.length}</small></div>
      <div class="wdots">${dots}</div></a>`;
  }

  // ---------- medallas ----------
  // Cada medalla mira una métrica y un umbral; la fecha es la del entreno con que la alcanzaste.
  const MEDALS = [
    ['Constancia', 'workouts', 1, '👟', 'Primer paso', 'Tu primer entreno'],
    ['Constancia', 'workouts', 10, '🚶', 'En marcha', '10 entrenos'],
    ['Constancia', 'workouts', 25, '📆', 'Hábito', '25 entrenos'],
    ['Constancia', 'workouts', 50, '🎖️', 'Medio centenar', '50 entrenos'],
    ['Constancia', 'workouts', 100, '💯', 'Club de los 100', '100 entrenos'],
    ['Constancia', 'workouts', 200, '👑', 'Leyenda', '200 entrenos'],
    ['Constancia', 'streak', 4, '🔥', 'Un mes en racha', '4 semanas seguidas cumpliendo'],
    ['Constancia', 'streak', 12, '☄️', 'Trimestre imparable', '12 semanas seguidas'],
    ['Constancia', 'streak', 26, '🌋', 'Medio año', '26 semanas seguidas'],
    ['Constancia', 'streak', 52, '🏔️', 'Un año entero', '52 semanas seguidas'],
    ['Constancia', 'perfect', 1, '📅', 'Mes perfecto', 'Todas las semanas de un mes cumplidas, sin comodines'],
    ['Constancia', 'perfect', 6, '🗓️', 'Seis meses perfectos', '6 meses perfectos'],
    ['Fuerza', 'prs', 1, '🏆', 'Primer récord', 'Supera tu mejor marca en un ejercicio'],
    ['Fuerza', 'prs', 10, '🥉', 'Bronce', '10 récords'],
    ['Fuerza', 'prs', 25, '🥈', 'Plata', '25 récords'],
    ['Fuerza', 'prs', 50, '🥇', 'Oro', '50 récords'],
    ['Fuerza', 'prs', 100, '💎', 'Diamante', '100 récords'],
    ['Fuerza', 'prDay', 3, '⚡', 'Día de gloria', '3 récords en un mismo entreno'],
    ['Kilos', 'dayKg', 1000, '🏋️', 'Primera tonelada', '1.000 kg en un entreno'],
    ['Kilos', 'dayKg', 5000, '🐘', 'Un elefante', '5.000 kg en un entreno'],
    ['Kilos', 'totalKg', 12000, '🚌', 'Un autobús', '12 t acumuladas'],
    ['Kilos', 'totalKg', 150000, '🐋', 'Ballena azul', '150 t acumuladas'],
    ['Kilos', 'totalKg', 500000, '🚀', 'Medio millón', '500 t acumuladas'],
    ['Hábitos', 'warmup', 20, '🌡️', 'Calentamiento de manual', '20 entrenos con aproximación'],
    ['Hábitos', 'core', 10, '🎯', 'Core de acero', '10 entrenos con core'],
    ['Hábitos', 'rated', 10, '🧘', 'Escucha tu cuerpo', 'Valora tu energía en 10 entrenos'],
  ].map(([group, metric, target, icon, name, desc]) => ({ id: `${metric}-${target}`, group, metric, target, icon, name, desc }));

  function medals() {
    const v = { workouts: 0, streak: 0, perfect: 0, prs: 0, prDay: 0, dayKg: 0, totalKg: 0, warmup: 0, core: 0, rated: 0 };
    const got = {};
    const check = (ts) => MEDALS.forEach(m => { if (!got[m.id] && v[m.metric] >= m.target) got[m.id] = ts; });
    const best = {};
    S().workouts.slice().sort((a, b) => a.start - b.start).forEach(w => {
      const kg = Nutrition.lifted(w);
      let prs = 0;
      if (!['hiit', 'descarga'].includes(w.type)) w.exercises.forEach(e => {
        const x = Progression.bestE1rm(e.sets);
        if (best[e.exId] && x > best[e.exId] + 1e-6) prs++;
        best[e.exId] = Math.max(best[e.exId] || 0, x);
      });
      v.workouts++; v.totalKg += kg; v.dayKg = Math.max(v.dayKg, kg); v.prs += prs; v.prDay = Math.max(v.prDay, prs);
      if (w.exercises.some(e => e.warmup?.length)) v.warmup++;
      if (w.exercises.some(e => Store.exercise(e.exId).pattern === 'core')) v.core++;
      if (w.energy) v.rated++;
      check(w.start);
    });
    // Racha y meses perfectos, semana a semana.
    const t = streakTimeline(), byMonth = {};
    t.weeks.forEach(x => {
      if (x.done) { v.streak = Math.max(v.streak, x.run); check(x.at); }
      const m = weekMonth(x.k); (byMonth[m] = byMonth[m] || []).push(x);
    });
    Object.entries(byMonth).sort().forEach(([m, list]) => {
      // Perfecto: mes ya terminado, con todas sus semanas registradas y cumplidas (sin comodines).
      if (m >= monthKey(Date.now()) || list.length < weeksInMonth(m) || list.some(x => !x.done)) return;
      v.perfect++; check(list[list.length - 1].at);
    });
    return { got, v, count: Object.keys(got).length };
  }
  // Medallas nuevas conseguidas justo con este entreno.
  const medalsFrom = w => { const { got } = medals(); return MEDALS.filter(m => got[m.id] === w.start); };

  function viewMedals() {
    const s = streak(), { got, v, count } = medals();
    let h = `<div class="card hero streak-hero"><div class="day-ic big">${s.cur ? '🔥' : '🌱'}</div><h2>${s.cur} ${s.cur === 1 ? 'semana' : 'semanas'} en racha</h2>
      <p class="muted">Tu objetivo: ${s.goal} días por semana · récord: ${s.best}</p>
      <div class="weeks-strip">${s.weeks.slice(-12).map(x => `<i class="${x.done ? 'on' : x.saved ? 'saved' : x.current ? 'cur' : ''}" title="${fmtDate(x.k)}">${x.saved ? '🛟' : ''}</i>`).join('')}</div>
      <p class="small">🛟 <b>${Math.max(0, s.jokersLeft)} de ${JOKERS} comodines</b> este mes. Si una semana no llegas a ${s.goal} días, se gasta uno solo y tu racha sigue.</p></div>`;
    h += `<div class="section-head"><h2>Medallas</h2><small>${count} de ${MEDALS.length}</small></div>`;
    [...new Set(MEDALS.map(m => m.group))].forEach(g => {
      h += `<h3 class="medal-group">${g}</h3><div class="medals">${MEDALS.filter(m => m.group === g).map(m => {
        const on = got[m.id], p = Math.min(1, v[m.metric] / m.target);
        const prog = m.metric.endsWith('Kg') ? `${fmtNum(Math.min(v[m.metric], m.target) / 1000)} / ${fmtNum(m.target / 1000)} t` : `${fmtNum(Math.min(Math.floor(v[m.metric] * 10) / 10, m.target))} / ${fmtNum(m.target)}`;
        return `<div class="medal ${on ? 'on' : ''}"><span class="mi">${m.icon}</span><b>${m.name}</b><small>${m.desc}</small>
          ${on ? `<small class="when">${fmtDate(on)}</small>` : m.target > 1 ? `<div class="mbar"><i style="width:${p * 100}%"></i></div><small class="when">${prog}</small>` : ''}</div>`;
      }).join('')}</div>`;
    });
    return h;
  }

  // ---------- confeti ----------
  function confetti(n = 140) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const c = document.createElement('canvas'), x = c.getContext('2d'), W = c.width = innerWidth, H = c.height = innerHeight;
    c.className = 'confetti'; document.body.appendChild(c);
    const cols = ['#ff6a2b', '#ff9a3d', '#34d399', '#5b8cff', '#fbbf24', '#ff6fae', '#a77bff'];
    const ps = Array.from({ length: n }, () => ({ x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35, vx: (Math.random() - .5) * 14, vy: -Math.random() * 14 - 4,
      r: Math.random() * Math.PI, vr: (Math.random() - .5) * .4, w: 6 + Math.random() * 6, h: 4 + Math.random() * 4, c: cols[Math.random() * cols.length | 0] }));
    const t0 = performance.now();
    (function frame(now) {
      const t = (now - t0) / 1000;
      x.clearRect(0, 0, W, H);
      ps.forEach(p => {
        p.vy += .35; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
        x.save(); x.translate(p.x, p.y); x.rotate(p.r); x.globalAlpha = Math.max(0, 1 - t / 2.8); x.fillStyle = p.c; x.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); x.restore();
      });
      if (t < 2.8) requestAnimationFrame(frame); else c.remove();
    })(t0);
  }

  // ---------- copia de seguridad: aviso una vez al mes ----------
  const MONTH = 30 * 864e5;
  function backupDue() {
    const s = S(); if (!s.workouts.length) return false;
    const since = Math.max(s.settings.lastBackup || 0, s.settings.backupNag || 0, Math.min(...s.workouts.map(w => w.start)));
    return Date.now() - since > MONTH;
  }
  function exportBackup() {
    S().settings.lastBackup = Date.now(); save();
    const name = `gymlog-${Store.currentUser().name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '')}-${ymd(Date.now())}.json`;
    const file = new File([Store.exportJSON()], name, { type: 'application/json' });
    // En el móvil, compartir permite guardarla directamente en Drive o enviártela.
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      navigator.share({ files: [file], title: 'Copia de GymLog' }).then(() => toast('💾 Copia guardada'), () => {});
    } else {
      const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = name; a.click();
      toast('💾 Copia descargada');
    }
  }

  // ---------- medidas corporales ----------
  const METRICS = { waist: { label: 'Cintura', unit: 'cm', icon: '📏' }, weight: { label: 'Peso', unit: 'kg', icon: '⚖️' },
    hip: { label: 'Cadera', unit: 'cm', icon: '📐' }, thigh: { label: 'Muslo', unit: 'cm', icon: '🦵' } };
  const measures = () => (S().measures || []).slice().sort((a, b) => a.d < b.d ? -1 : 1);
  const series = k => measures().filter(m => m[k] !== '' && m[k] != null).map(m => ({ d: m.d, v: Number(m[k]) }));
  const dts = d => new Date(d + 'T12:00').getTime();
  // Valor de una medida en una fecha (la última anotada hasta entonces).
  const valueAt = (k, ts) => series(k).filter(p => dts(p.d) <= ts).pop();

  function viewMeasures() {
    const today = ymd(Date.now()), used = Object.keys(METRICS).filter(k => series(k).length);
    const extra = ['hip', 'thigh'], openExtra = extra.some(k => used.includes(k));
    const field = k => `<label>${METRICS[k].label} (${METRICS[k].unit})<input type="number" inputmode="decimal" step="0.1" id="m-${k}" data-ms placeholder="${METRICS[k].unit}"></label>`;
    let h = `<div class="card"><h2>📏 Medidas</h2><p class="muted small">Rellena solo lo que quieras: la app usa lo que tengas.
      Mídete la cintura a la altura del ombligo, por la mañana y siempre igual, cada 2–4 semanas.</p>
      <div class="rx-fields two"><label>Fecha<input type="date" id="m-date" max="${today}" value="${today}"></label>${field('waist')}${field('weight')}</div>
      <details ${openExtra ? 'open' : ''}><summary class="muted small">Más medidas (cadera, muslo)</summary><div class="rx-fields two">${extra.map(field).join('')}</div></details>
      <button class="btn primary block" data-act="save-measure">Guardar</button></div>`;
    used.forEach(k => {
      const s = series(k), M = METRICS[k], last = s[s.length - 1], first = s[0];
      const month = valueAt(k, Date.now() - MONTH);
      const diff = (a, b) => { const v = Math.round((a - b) * 10) / 10; return v ? `${v > 0 ? '▲' : '▼'} ${fmtNum(Math.abs(v))} ${M.unit}` : '= sin cambios'; };
      h += `<div class="card"><div class="row between"><h3>${M.icon} ${M.label}</h3><b class="m-big">${fmtNum(last.v)} <small>${M.unit}</small></b></div>
        ${s.length > 1 ? `<p class="small">Desde el inicio (${Cycle.fmt(first.d)}): <b>${diff(last.v, first.v)}</b>${month && month.d !== last.d && month.d !== first.d ? ` · último mes: <b>${diff(last.v, month.v)}</b>` : ''}</p>
          ${lineChart(s.map(p => ({ x: dts(p.d), y: p.v, tip: `${Cycle.fmt(p.d)} · ${fmtNum(p.v)} ${M.unit}` })), v => fmtNum(v))}`
          : '<p class="muted small">Con una segunda medida verás cómo evoluciona.</p>'}</div>`;
    });
    if (used.includes('waist') && series('waist').length > 1) {
      h += `<p class="muted small">💡 En recomposición, cintura que baja con cargas que suben = vas bien, aunque la báscula no se mueva.</p>`;
    }
    const list = measures().reverse();
    if (list.length) h += `<div class="card"><h3>Anotadas</h3>${list.slice(0, 12).map(m => `<div class="hist-row"><span>${Cycle.fmt(m.d)}</span>
      <span class="grow">${Object.keys(METRICS).filter(k => m[k] !== '' && m[k] != null).map(k => `${METRICS[k].label} ${fmtNum(m[k])}`).join(' · ')}</span>
      <button class="icon" data-act="del-measure" data-d="${m.d}" title="Borrar">✕</button></div>`).join('')}</div>`;
    return h;
  }

  // ---------- resumen mensual ----------
  const MONTHS = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const monthKey = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; };
  const monthRange = key => { const [y, m] = key.split('-').map(Number); return [new Date(y, m - 1, 1).getTime(), new Date(y, m, 1).getTime()]; };
  const monthName = key => MONTHS[Number(key.slice(5)) - 1];
  const shiftMonth = (key, n) => { const [y, m] = key.split('-').map(Number); return monthKey(new Date(y, m - 1 + n, 1)); };
  // Récords: cada vez que el 1RM estimado de un ejercicio supera todo lo anterior.
  function prEvents() {
    const best = {}, ev = [];
    S().workouts.filter(w => !['hiit', 'descarga'].includes(w.type)).sort((a, b) => a.start - b.start).forEach(w => w.exercises.forEach(e => {
      const v = Progression.bestE1rm(e.sets);
      if (best[e.exId] && v > best[e.exId] + 1e-6) ev.push({ w, e, v, prev: best[e.exId] });
      best[e.exId] = Math.max(best[e.exId] || 0, v);
    }));
    return ev;
  }
  function monthStats(key) {
    const [a, b] = monthRange(key), ws = S().workouts.filter(w => w.start >= a && w.start < b);
    const rated = ws.filter(w => w.energy);
    return { ws, kg: ws.reduce((s, w) => s + Nutrition.lifted(w), 0), sets: ws.reduce((s, w) => s + doneSets(w), 0),
      ms: ws.reduce((s, w) => s + (w.end - w.start), 0), energy: rated.length ? rated.reduce((s, w) => s + w.energy, 0) / rated.length : 0,
      days: new Set(ws.map(w => startOfDay(w.start))) };
  }
  function viewMonth(key) {
    key = key || monthKey(Date.now());
    const [a, b] = monthRange(key), st = monthStats(key), prev = monthStats(shiftMonth(key, -1)), cur = monthKey(Date.now());
    const nav = `<div class="month-nav"><a class="icon" href="#/mes/${shiftMonth(key, -1)}" aria-label="Mes anterior">‹</a>
      <h2>${monthName(key)[0].toUpperCase() + monthName(key).slice(1)} ${key.slice(0, 4)}</h2>
      ${key < cur ? `<a class="icon" href="#/mes/${shiftMonth(key, 1)}" aria-label="Mes siguiente">›</a>` : '<span class="icon"></span>'}</div>`;
    if (!st.ws.length) return nav + `<div class="card hero"><div class="day-ic big">📅</div><p class="muted">Sin entrenos este mes${key === cur ? ' todavía. ¡El primero cuenta doble!' : '.'}</p></div>`;
    // Comparar con un mes casi vacío daría porcentajes absurdos: solo si el anterior tuvo 4+ entrenos.
    const pct = (x, y) => y && prev.ws.length >= 4 ? Math.round((x / y - 1) * 100) : null;
    const delta = (x, y) => { const p = pct(x, y); return p ? `<small class="delta ${p > 0 ? 'pos' : 'neg'}">${p > 0 ? '▲' : '▼'} ${Math.abs(p)} %</small>` : ''; };
    const c = Nutrition.compare(st.kg);
    let h = nav + `<div class="card hero sum month-hero"><p class="lift-label">${key === cur ? 'Este mes llevas' : 'Este mes levantaste'}</p>
      <div class="lift"><b data-count="${Math.round(st.kg)}">0</b> kg</div>
      <p class="lift-cmp">¡${fmtNum(c.count)} ${c.name} ${c.emoji}!</p>${prev.kg && prev.ws.length >= 4 ? `<p class="muted small">vs. ${monthName(shiftMonth(key, -1))}: ${delta(st.kg, prev.kg) || 'igual'}</p>` : ''}
      <div class="stats inner"><div><b>${st.ws.length}</b><small>entrenos</small>${delta(st.ws.length, prev.ws.length)}</div>
      <div><b>${st.sets}</b><small>series</small></div><div><b>${fmtDur(st.ms)}</b><small>entrenando</small></div></div></div>`;
    // Calendario del mes: un cuadrito por día, encendido si entrenaste.
    const first = new Date(a), offset = (first.getDay() + 6) % 7, n = Math.round((b - a) / 864e5);
    const today = startOfDay(Date.now());
    h += `<div class="card"><h3>🗓️ Tus días</h3><div class="cal">${['L', 'M', 'X', 'J', 'V', 'S', 'D'].map(d => `<span class="cal-h">${d}</span>`).join('')}
      ${'<span></span>'.repeat(offset)}${Array.from({ length: n }, (_, i) => { const t = new Date(first.getFullYear(), first.getMonth(), i + 1).getTime();
        return `<span class="cal-d ${st.days.has(t) ? 'on' : ''} ${t === today ? 'today' : ''} ${t > today ? 'future' : ''}">${i + 1}</span>`; }).join('')}</div>
      <p class="muted small">${st.days.size} ${st.days.size === 1 ? 'día entrenado' : 'días entrenados'}.</p></div>`;
    const prs = prEvents().filter(x => x.w.start >= a && x.w.start < b), byEx = {};
    prs.forEach(x => { if (!byEx[x.e.exId] || x.v > byEx[x.e.exId].v) byEx[x.e.exId] = Object.assign({}, x, { first: byEx[x.e.exId]?.first ?? x.prev }); });
    const top = Object.values(byEx).sort((x, y) => (y.v / y.first) - (x.v / x.first));
    h += `<div class="card"><h3>🏆 Récords del mes${top.length ? ` · ${top.length}` : ''}</h3>${top.length ? top.map(x => `<div class="hist-row"><span class="grow">${esc(Store.exercise(x.e.exId).name)}</span>
      <span><b>${fmtNum(x.v)}</b> <small class="muted">▲ ${Math.max(1, Math.round((x.v / x.first - 1) * 100))} %</small></span></div>`).join('')
      : '<p class="muted small">Ninguno este mes. Los meses de consolidar también cuentan.</p>'}<p class="muted small">1RM estimado.</p></div>`;
    const strong = st.ws.slice().sort((x, y) => Nutrition.lifted(y) - Nutrition.lifted(x))[0];
    if (Nutrition.lifted(strong) > 0) h += `<a class="card row between" href="#/resumen/${strong.id}"><div class="day-ic">${workoutIcon(strong)}</div><div class="grow" style="margin-left:12px">
      <small>💥 Tu sesión más fuerte</small><b>${esc(strong.dayName)}</b><small>${fmtDate(strong.start)} · ${fmtNum(Math.round(Nutrition.lifted(strong)))} kg</small></div><span class="chev">›</span></a>`;
    if (st.energy) h += `<div class="card row between"><div class="grow"><small>Energía media al terminar</small><b>${Cycle.ENERGY[Math.round(st.energy)].icon} ${fmtNum(st.energy)}/4</b></div></div>`;
    const w0 = valueAt('waist', a - 1) || series('waist').find(p => dts(p.d) >= a), w1 = valueAt('waist', b - 1);
    if (w0 && w1 && w1.d !== w0.d && dts(w1.d) >= a) {
      const d = Math.round((w1.v - w0.v) * 10) / 10;
      h += `<a class="card row between" href="#/medidas"><div class="grow"><small>📏 Cintura</small><b>${fmtNum(w1.v)} cm ${d ? `<small class="delta ${d < 0 ? 'pos' : 'neg'}">${d < 0 ? '▼' : '▲'} ${fmtNum(Math.abs(d))} cm</small>` : ''}</b></div><span class="chev">›</span></a>`;
    }
    return h;
  }

  // ---------- ciclo ----------
  // Chip discreto en Inicio. Sin alarmas: si se retrasa, solo invita a anotarlo.
  function cycleChip() {
    if (!S().cycle.enabled) return '';
    const st = Cycle.at();
    if (!st) return `<a class="cycle-chip" href="#/ciclo">🌙 Anota el primer día de tu regla<span class="chev">›</span></a>`;
    const ask = st.late ? '¿Ya te ha venido? Anótalo cuando quieras' : '';
    return `<div class="cycle-row"><a class="cycle-chip ${st.phase ? 'ph-' + st.phase : ''}" href="#/ciclo">${st.phase ? Cycle.PHASES[st.phase].icon : '🌙'} ${ask || Cycle.label(st)}<span class="chev">›</span></a>
      ${st.due ? '<button class="cycle-chip btn-chip" data-act="cycle-start" data-when="today">🩸 Me ha venido hoy</button>' : ''}</div>`;
  }

  function viewCycle() {
    const c = S().cycle;
    if (!c.enabled) return `<div class="card hero"><div class="day-ic big">🌙</div><h2>Seguimiento del ciclo</h2>
      <p class="muted">Está desactivado. Puedes activarlo en Ajustes.</p><a class="btn primary" href="#/ajustes">Ir a Ajustes</a></div>`;
    const st = Cycle.at(), today = Cycle.ymd();
    let h = '';
    if (st) {
      const ph = st.phase && Cycle.PHASES[st.phase], pat = Cycle.pattern(), mine = st.phase && pat.phases[st.phase];
      h += `<div class="card hero cycle-hero ${st.phase ? 'ph-' + st.phase : ''}"><div class="cy-day"><small>Día</small><b>${st.day}</b><small>de ~${st.len}</small></div>
        <h2>${ph ? `${ph.icon} Fase ${ph.label}` : '🌙 Tu ciclo'}</h2>`;
      if (st.phase) {
        const ov = Math.max(10, st.len - 14), seg = [5, ov - 7, 3, st.len - ov - 1];
        h += `<div class="cy-bar">${Cycle.ORDER.map((p, i) => `<i class="ph-${p}" style="flex:${Math.max(1, seg[i])}"></i>`).join('')}
          <span class="cy-mark" style="left:${Math.min(100, (st.day - 0.5) / st.len * 100)}%"></span></div>`;
        // Con datos suficientes, tus números sustituyen a la frase genérica.
        h += pat.ready && mine.n >= 3
          ? `<p class="cy-note">📊 <b>Tus datos:</b> en esta fase tu energía media es <b>${fmtNum(mine.avg)}/4</b> (${mine.n} entrenos)${mine.prs ? ` y llevas <b>${mine.prs} ${mine.prs === 1 ? 'récord' : 'récords'}</b> 🏆` : ''}.</p>`
          : `<p class="cy-note">${ph.note}</p>`;
        h += `<p class="cy-tip">💡 ${Cycle.tip(st.phase)}</p>`;
      } else h += `<p class="cy-note">${c.hormonal ? 'Con anticonceptivo hormonal las fases se aplanan, así que no te muestro fases ni consejos por fase.' : 'Con ciclos irregulares las fases estimadas fallan mucho, así que solo te muestro el día.'}</p>`;
      h += `<p class="muted small">Orientativo: manda cómo te sientes hoy, no el calendario.</p></div>`;
    } else {
      h += `<div class="card hero"><div class="day-ic big">🌙</div><h2>Tu ciclo</h2><p class="muted">Anota el primer día de tu última regla para empezar.</p></div>`;
    }
    h += `<div class="card"><h3>🩸 Me ha venido la regla</h3>
      <button class="btn primary block" data-act="cycle-start" data-when="today">Hoy</button>
      <div class="row gap"><input type="date" id="cy-date" max="${today}" value="${today}" class="grow" style="width:auto;flex:1;margin:0">
      <button class="btn" data-act="cycle-start">Otro día</button></div></div>`;
    h += patternCard();
    const list = Cycle.starts().reverse();
    if (list.length) h += `<div class="card"><h3>Reglas anotadas</h3>${list.slice(0, 8).map((s, i) => {
      const len = i > 0 ? Math.round((Date.parse(list[i - 1]) - Date.parse(s)) / 864e5) : null;
      return `<div class="hist-row"><span>${Cycle.fmt(s)}</span><span class="grow muted">${len ? `ciclo de ${len} días` : 'actual'}</span>
        <button class="icon" data-act="cycle-del" data-d="${s}" title="Borrar">✕</button></div>`;
    }).join('')}<p class="muted small">Duración media: ${Cycle.avgLength()} días${list.length < 2 ? ' (estimada hasta tener dos reglas anotadas)' : ''}.</p></div>`;
    return h + `<a class="btn block ghost" href="#/ajustes">⚙️ Opciones del ciclo</a>
      <p class="muted small">No es un método anticonceptivo ni diagnóstico. Tus datos del ciclo solo se guardan en este móvil.</p>`;
  }

  function patternCard() {
    const c = S().cycle;
    if (c.hormonal || c.irregular) return '';
    const pat = Cycle.pattern();
    if (!pat.ready) return `<div class="card"><h3>📊 Tu patrón</h3><p class="muted small">Valora cómo te has sentido al terminar cada entreno (😴 😐 🙂 💪).
      Con 2 ciclos anotados verás tu energía y tus récords en cada fase: <b>tus datos, no un promedio</b>.</p>
      <p class="small">Llevas ${pat.rated} ${pat.rated === 1 ? 'entreno valorado' : 'entrenos valorados'} · ${Math.max(0, Cycle.starts().length - 1)} de 2 ciclos completos.</p></div>`;
    return `<div class="card"><h3>📊 Tu patrón</h3><p class="muted small">Energía media y récords en cada fase, con tus entrenos valorados.</p>
      ${Cycle.ORDER.map(p => { const x = pat.phases[p], P = Cycle.PHASES[p];
        return `<div class="vol cy-vol"><span>${P.icon} ${P.label[0].toUpperCase() + P.label.slice(1)}</span>
          <div class="vol-track"><div class="vol-bar ph-${p}" style="width:${x.avg / 4 * 100}%"></div></div>
          <b>${x.n ? fmtNum(x.avg) : '–'}</b></div><small class="cy-sub">${x.n} ${x.n === 1 ? 'entreno' : 'entrenos'}${x.prs ? ` · ${x.prs} 🏆` : ''}</small>`; }).join('')}</div>`;
  }

  function energyCard(w) {
    return `<div class="card feel"><h3>¿Cómo te has sentido hoy?</h3><div class="feel-row">${Object.entries(Cycle.ENERGY).map(([v, e]) =>
      `<button class="${w.energy === Number(v) ? 'on' : ''}" data-act="rate-energy" data-id="${w.id}" data-v="${v}"><span>${e.icon}</span><small>${e.label}</small></button>`).join('')}</div></div>`;
  }

  function cycleSettings() {
    const c = S().cycle;
    if (S().settings.sex !== 'mujer' && !c.enabled) return '';
    const chk = (k, txt) => `<label class="check-row"><input type="checkbox" data-cy="${k}" ${c[k] ? 'checked' : ''}> ${txt}</label>`;
    return `<div class="card"><h3>🌙 Seguimiento del ciclo</h3>
      <p class="muted small">Opcional. Te dice en qué fase estás y te da algún consejo, pero nunca cambia tu rutina: manda cómo te sientes.</p>
      ${chk('enabled', 'Activar seguimiento del ciclo')}
      ${c.enabled ? `${chk('hormonal', 'Uso anticonceptivo hormonal')}${chk('irregular', 'Ciclo irregular o perimenopausia')}
        ${chk('share', 'Incluir la fase en el resumen en texto')}
        <div class="row gap"><a class="btn small" href="#/ciclo">🌙 Mi ciclo</a>
        <button class="btn small ghost danger" data-act="cycle-clear">Borrar datos del ciclo</button></div>` : ''}</div>`;
  }

  function viewGenerator() {
    const p = S().profile || { goal: 'recomposicion', days: 4, level: 'intermedio', brands: Generator.BRANDS.slice() };
    const opt = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k == sel ? 'selected' : ''}>${esc(v.label || v)}</option>`).join('');
    return `<div class="card"><h2>Generar rutina</h2>
      <label>Objetivo<select id="g-goal">${opt(Generator.GOALS, p.goal)}</select></label>
      <label>Días por semana<select id="g-days">${[2, 3, 4, 5, 6].map(n => `<option ${n == p.days ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Nivel<select id="g-level">${opt(Generator.LEVELS, p.level)}</select></label>
      <fieldset><legend>Material disponible</legend>
        ${Generator.BRANDS.map(b => `<label class="check-row"><input type="checkbox" class="g-brand" value="${b}" ${(p.brands || Generator.BRANDS).includes(b) ? 'checked' : ''}> ${b === 'Genérico' ? 'Peso libre, poleas y multipower' : b}</label>`).join('')}
      </fieldset>
      ${excluded().length ? `<p class="muted small">Se evitan: ${excluded().map(id => esc(Store.exercise(id).name)).join(', ')}.</p>` : ''}
      <button class="btn primary block" data-act="generate">Generar</button>
      <p class="muted small">Podrás cambiar cualquier ejercicio, serie o rango después.</p></div>`;
  }

  function viewRoutines() {
    const s = S();
    let h = `<div class="row gap"><a class="btn primary" href="#/generar">Generar rutina</a><button class="btn ghost" data-act="new-routine">Rutina vacía</button>
      <label class="btn ghost file-btn">📥 Importar<input type="file" accept="application/json,.json" id="import-routine" hidden></label></div>`;
    s.routines.forEach(r => {
      if (Store.outdatedPreset(r)) h += `<div class="card accent-b row between"><div class="grow"><b>📥 Hay una versión nueva de ${esc(r.name)}</b>
        <small>Sustituye los ejercicios y notas; tu historial se mantiene.</small></div>
        <button class="btn small primary" data-act="update-preset" data-id="${r.id}">Actualizar</button></div>`;
    });
    PRESETS.filter(p => !s.routines.some(r => r.presetKey === p.key)).forEach(p => {
      h += `<div class="card row between"><div><b>${esc(p.name)}</b><small>Rutina predefinida</small></div>
        <button class="btn small" data-act="add-preset" data-key="${p.key}">Cargar</button></div>`;
    });
    if (!s.routines.length) return h + '<p class="muted">Aún no tienes rutinas.</p>';
    s.routines.forEach(r => {
      const active = r.id === s.activeRoutineId;
      h += `<div class="card ${active ? 'active-r' : ''}"><div class="row between"><b>${esc(r.name)}</b>${active ? '<span class="tag">Activa</span>' : ''}</div>
        <div class="day-strip">${r.days.map(d => `<span title="${esc(d.name)}">${d.icon || '🏋️'}</span>`).join('')}</div>
        <div class="row gap"><a class="btn small" href="#/rutina/${r.id}">Editar</a>
        ${active ? '' : `<button class="btn small" data-act="activate" data-id="${r.id}">Activar</button>`}
        <button class="btn small ghost" data-act="dup-routine" data-id="${r.id}">Duplicar</button>
        <button class="btn small ghost" data-act="share-routine" data-id="${r.id}">Compartir</button>
        <button class="btn small ghost danger" data-act="del-routine" data-id="${r.id}">Borrar</button></div></div>`;
    });
    return h;
  }

  function viewRoutine(id) {
    const r = routineById(id);
    if (!r) return '<p>Rutina no encontrada.</p>';
    const active = r.id === S().activeRoutineId;
    let h = `<div class="card"><label>Nombre<input data-rf="name" data-rid="${r.id}" value="${esc(r.name)}"></label>
      <label>Notas generales (lesiones, restricciones…)<textarea data-rf="notes" data-rid="${r.id}" rows="3">${esc(r.notes)}</textarea></label>
      ${active ? '<span class="tag">Rutina activa</span>' : `<button class="btn small" data-act="activate" data-id="${r.id}">Activar</button>`}</div>`;
    r.days.forEach((d, di) => {
      h += `<section class="card"><div class="row between">
        <details class="icon-pick"><summary class="day-ic" title="Cambiar icono">${d.icon || '🏋️'}</summary>
          <div class="icon-grid">${Icons.DAY.map(i => `<button data-act="set-icon" data-rid="${r.id}" data-di="${di}" data-icon="${i}">${i}</button>`).join('')}</div></details>
        <input class="day-name grow" data-df="name" data-rid="${r.id}" data-di="${di}" value="${esc(d.name)}">
        <button class="icon" data-act="del-day" data-rid="${r.id}" data-di="${di}" title="Borrar día">🗑</button></div>`;
      d.exercises.forEach((x, xi) => {
        const ex = Store.exercise(x.exId);
        const a = `data-rid="${r.id}" data-di="${di}" data-xi="${xi}"`;
        h += `<div class="rx"><div class="rx-head">${thumb(x.exId, 'sm')}<div class="grow"><b>${esc(ex.name)}</b><small>${esc(ex.brand)}${ex.line ? ' · ' + esc(ex.line) : ''}</small></div>
          <div class="rx-btns"><button class="icon" data-act="mv" ${a} data-dir="-1">↑</button><button class="icon" data-act="mv" ${a} data-dir="1">↓</button>
          <a class="icon" href="#/elegir/${r.id}/${di}/${xi}" title="Cambiar">⇄</a><button class="icon" data-act="del-rx" ${a}>✕</button></div></div>
          ${rxFields(x, a)}
          <label>Nota<input data-xf="note" ${a} value="${esc(x.note)}" placeholder="Técnica, molestias, ajustes de la máquina…"></label>
          ${xi < d.exercises.length - 1 ? `<label class="check-row small"><input type="checkbox" data-xs ${a} ${x.superset ? 'checked' : ''}> 🔗 Superserie con el siguiente</label>` : ''}</div>`;
      });
      h += `<a class="btn small" href="#/elegir/${r.id}/${di}">+ Añadir ejercicio</a></section>`;
    });
    h += `<button class="btn block ghost" data-act="add-day" data-rid="${r.id}">+ Añadir día</button>`;
    return h + volumeCard(r);
  }

  const bandOptions = sel => `<option value="">—</option>` +
    Object.entries(BANDS).map(([k, b]) => `<option value="${k}" ${k === sel ? 'selected' : ''}>${b.dot} ${b.label}</option>`).join('');
  const secsOptions = sel => [...new Set(HOLD_STEPS.concat(Number(sel) || 30))].sort((a, b) => a - b)
    .map(n => `<option value="${n}" ${n === (Number(sel) || 30) ? 'selected' : ''}>${fmtRest(n)}</option>`).join('');

  // Campos de un ejercicio de la rutina: por tiempo no hay reps ni peso; con goma, goma de referencia.
  function rxFields(x, a) {
    const mode = Store.exSettings(x.exId).mode;
    const f = (lbl, k, extra = '') => `<label ${extra}>${lbl}<input type="number" inputmode="numeric" data-xf="${k}" ${a} value="${esc(x[k])}"></label>`;
    if (mode === 'tiempo') return `<div class="rx-fields">${f('Series', 'sets')}
      <label>Tiempo<select data-xf="secs" ${a}>${secsOptions(x.secs)}</select></label>${f('Desc. s', 'rest')}</div>`;
    return `<div class="rx-fields">${f('Series', 'sets')}${f('Reps mín', 'repMin')}${f('Reps máx', 'repMax')}${f('RIR', 'rir')}${f('Desc. s', 'rest')}
      ${mode === 'goma' ? `<label title="Goma para la primera sesión">Goma ref.<select data-xf="band" ${a}>${bandOptions(x.band)}</select></label>`
        : `<label title="Peso para la primera sesión (después manda tu historial)">Peso ref.<input type="number" inputmode="decimal" step="any" data-xf="kg" ${a} value="${esc(x.kg)}"></label>`}</div>`;
  }

  const VOL_NOTE = 'Franja verde: ~10–20 series por semana en los músculos grandes. Brazos, gemelos y core ya trabajan en los básicos: no necesitan llegar.';
  function volumeCard(r) {
    const bars = volBars(planVolume(r));
    return bars && `<div class="card"><h3>Series semanales por músculo</h3><p class="muted small">${VOL_NOTE}</p>${bars}</div>`;
  }
  // Para el contador, la espalda y el hombro van juntos; la franja 10–20 solo se aplica a los músculos grandes.
  const VOL_GROUP = { Dorsal: 'Espalda', 'Espalda alta': 'Espalda', 'Hombro posterior': 'Hombro' };
  const BIG = ['Glúteo', 'Cuádriceps', 'Isquios', 'Espalda', 'Pecho', 'Hombro'];
  // Cuánto cuenta una serie para cada grupo: principal 1, secundario ½. Un remo que trabaja dorsal y espalda alta
  // cuenta 1 para "Espalda", no 1,5.
  function exShare(exId) {
    const ex = Store.exercise(exId), s = {}, g = m => VOL_GROUP[m] || m;
    if (ex.pattern === 'mobility') return s; // la movilidad no suma series
    ex.secondary.forEach(m => { s[g(m)] = Math.max(s[g(m)] || 0, 0.5); });
    ex.primary.forEach(m => { s[g(m)] = 1; });
    return s;
  }
  const addVol = (v, exId, n) => Object.entries(exShare(exId)).forEach(([m, k]) => { v[m] = (v[m] || 0) + n * k; });
  function planVolume(r) {
    const v = {};
    r.days.forEach(d => d.exercises.forEach(x => addVol(v, x.exId, Number(x.sets) || 0)));
    return v;
  }
  // Barras de series por músculo. Con plan, una marca indica lo que prevé la rutina.
  function volBars(v, plan) {
    const rows = Object.entries(v).filter(x => x[1] > 0 || plan?.[x[0]])
      .sort((a, b) => BIG.includes(b[0]) - BIG.includes(a[0]) || b[1] - a[1]);
    if (!rows.length) return '';
    const max = Math.max(22, ...rows.map(x => x[1]), ...Object.values(plan || {}));
    return rows.map(([m, n]) => {
      const big = BIG.includes(m);
      return `<div class="vol ${big ? '' : 'minor'}"><span>${m}</span><div class="vol-track">${big ? `<div class="vol-band" style="left:${10 / max * 100}%;width:${10 / max * 100}%"></div>` : ''}
        <div class="vol-bar ${!big ? 'neutral' : n < 10 ? 'low' : n > 20 ? 'high' : 'ok'}" style="width:${n / max * 100}%"></div>
        ${plan?.[m] ? `<i class="vol-plan" style="left:${plan[m] / max * 100}%" title="Plan: ${+plan[m].toFixed(1)}"></i>` : ''}</div><b>${+n.toFixed(1)}</b></div>`;
    }).join('');
  }
  // Series hechas por músculo en los últimos 7 días (principal 1, secundario ½, como el plan).
  function doneVolume() {
    const v = {}, since = startOfDay(Date.now()) - 6 * 864e5;
    S().workouts.filter(w => w.start >= since && w.type !== 'hiit').forEach(w => w.exercises.forEach(e =>
      addVol(v, e.exId, e.sets.filter(s => s.done !== false).length)));
    return v;
  }
  function weekVolumeCard() {
    const r = activeRoutine(), plan = r ? planVolume(r) : null;
    const v = doneVolume();
    if (plan) Object.keys(plan).forEach(m => { v[m] = v[m] || 0; });
    const bars = volBars(v, plan);
    return bars ? `<details class="card week-vol" open><summary><b>💪 Series por músculo · últimos 7 días</b></summary>
      <p class="muted small">${VOL_NOTE}${plan ? ' La rayita marca lo que prevé tu rutina.' : ''}</p>${bars}</details>` : '';
  }

  // ---------- progreso por grupo muscular ----------
  // Semana a semana: series hechas del grupo, o su fuerza = media del 1RM estimado de cada ejercicio
  // en el que el grupo es principal, respecto a su primera sesión (100). Solo ejercicios con peso
  // y hechos en las últimas 6 semanas, para que uno abandonado no congele la media.
  const PG_WEEKS = 12, PG_ORDER = ['Glúteo', 'Cuádriceps', 'Isquios', 'Espalda', 'Pecho', 'Hombro', 'Bíceps', 'Tríceps', 'Gemelos', 'Aductores', 'Abdomen', 'Lumbar'];
  function groupProgress(group) {
    const ws = S().workouts.filter(w => w.type !== 'hiit').sort((a, b) => a.start - b.start);
    const now = weekStart(Date.now()), from = addWeeks(now, -(PG_WEEKS - 1));
    const base = {}, last = {}, out = [];
    let i = 0;
    for (let k = weekStart(ws[0]?.start || now); k <= now; k = addWeeks(k, 1)) {
      const end = addWeeks(k, 1);
      let sets = 0;
      for (; i < ws.length && ws[i].start < end; i++) {
        const w = ws[i];
        w.exercises.forEach(e => {
          const sh = exShare(e.exId)[group];
          if (!sh) return;
          sets += sh * e.sets.filter(s => s.done !== false).length;
          if (sh < 1 || w.type === 'descarga' || ['goma', 'tiempo'].includes(Store.exSettings(e.exId).mode)) return;
          const v = Progression.bestE1rm(e.sets.filter(s => s.done));
          if (v > 0) { base[e.exId] = base[e.exId] || v; last[e.exId] = { v, t: w.start }; }
        });
      }
      const live = Object.keys(last).filter(id => last[id].t >= addWeeks(end, -6));
      const str = live.length ? live.reduce((a, id) => a + last[id].v / base[id], 0) / live.length * 100 : null;
      if (k >= from) out.push({ k, sets, str, n: live.length });
    }
    return out;
  }
  function groupProgressCard() {
    const has = PG_ORDER.filter(g => S().workouts.some(w => w.type !== 'hiit' && w.exercises.some(e => exShare(e.exId)[g])));
    if (!has.length) return '';
    const g = has.includes(ui.pg) ? ui.pg : has[0], metric = ui.pm || 'sets';
    const weeks = groupProgress(g).filter((x, i, a) => a.slice(0, i + 1).some(y => y.sets)); // desde la primera semana con datos
    const chips = has.map(x => `<button class="chip ${x === g ? 'on' : ''}" data-act="pg-group" data-v="${x}">${x}</button>`).join('');
    const tabs = [['sets', 'Series / semana'], ['str', 'Fuerza']].map(([k, t]) => `<button class="seg-btn ${k === metric ? 'on' : ''}" data-act="pg-metric" data-v="${k}">${t}</button>`).join('');
    const wk = ts => `Semana del ${new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}`;
    let body;
    if (metric === 'sets') {
      const avg = list => list.length ? list.reduce((a, x) => a + x.sets, 0) / list.length : 0;
      // La semana en curso va a medias: solo semanas completas.
      const full = weeks.filter(x => x.k < weekStart(Date.now())), recent = full.slice(-4), before = full.slice(-8, -4);
      body = full.length < 2 ? '<p class="muted small">Con dos semanas de entrenos verás la evolución.</p>'
        : `<p class="small">Media de las últimas ${recent.length} semanas: <b>${fmtNum(avg(recent))} series</b>${before.length ? ` · las ${before.length} anteriores: ${fmtNum(avg(before))}` : ''}</p>
          ${lineChart(full.map(x => ({ x: x.k, y: x.sets, tip: `${wk(x.k)} · ${fmtNum(x.sets)} series` })), v => fmtNum(v))}`;
    } else {
      const pts = weeks.filter(x => x.str);
      const lastP = pts[pts.length - 1], pct = lastP ? Math.round(lastP.str - 100) : 0;
      body = pts.length < 2 ? `<p class="muted small">Aún no hay suficientes sesiones con peso de ${g.toLowerCase()} para dibujar la fuerza.</p>`
        : `<p class="small">${pct ? `<b>${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)} %</b> respecto a tu primera sesión` : 'Igual que en tu primera sesión'} · media de ${lastP.n} ${lastP.n === 1 ? 'ejercicio' : 'ejercicios'}</p>
          ${lineChart(pts.map(x => ({ x: x.k, y: x.str, tip: `${wk(x.k)} · ${x.str >= 100 ? "+" : ""}${fmtNum(x.str - 100)} %`, sub: `${x.n} ${x.n === 1 ? 'ejercicio' : 'ejercicios'}` })), v => `${v >= 100 ? '+' : ''}${fmtNum(v - 100)} %`)}`;
    }
    return `<div class="card group-prog"><h3>📈 Progreso por grupo muscular</h3><div class="chips scroll">${chips}</div><div class="seg">${tabs}</div>${body}
      <p class="muted small">${metric === 'sets' ? `Semanas completas, hasta 12. Principal 1 serie, secundario ½.` : '1RM estimado de cada ejercicio de este grupo frente a su primera sesión (100 = como empezaste). Sube aunque cambies de peso o reps.'}</p></div>`;
  }

  // Selector de ejercicios: para rutinas (añadir/cambiar) o para el entreno en curso.
  let pickerCtx = null;
  function viewPicker(rid, di, xi) {
    pickerCtx = { rid, di: Number(di), xi: xi === undefined ? null : Number(xi) };
    let pattern = null;
    if (pickerCtx.xi !== null) {
      const list = rid === 'workout' ? S().activeWorkout?.exercises : routineById(rid)?.days[pickerCtx.di].exercises;
      const cur = list?.[pickerCtx.xi];
      if (!cur) return '<p>Nada que cambiar.</p>';
      pattern = Store.exercise(cur.exId).pattern;
    }
    pickerCtx.pattern = pattern;
    return `<h2>${pattern ? 'Cambiar ejercicio' : 'Añadir ejercicio'}</h2>${filtersHTML(!!pattern)}<div id="list">${listHTML('pick')}</div>`;
  }

  function filtersHTML(withPattern) {
    const brands = ['all', ...Generator.BRANDS, ...(S().customExercises.length ? ['Mis máquinas'] : [])];
    return `<div class="filters"><input id="q" type="search" placeholder="Buscar máquina o ejercicio…" value="${esc(ui.q)}">
      <div class="chips">${brands.map(b => `<button class="chip ${ui.brand === b ? 'on' : ''}" data-act="f-brand" data-v="${b}">${b === 'all' ? 'Todas' : b}</button>`).join('')}</div>
      <div class="filter-row"><select id="f-muscle"><option value="all">Todos los músculos</option>${MUSCLES.map(m => `<option ${ui.muscle === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
      <select id="f-load"><option value="all">Todo el material</option>${Object.entries(LOAD_TYPES).map(([k, v]) => `<option value="${k}" ${ui.load === k ? 'selected' : ''}>${v}</option>`).join('')}</select></div>
      ${withPattern ? `<label class="check-row"><input type="checkbox" id="f-same" ${ui.samePattern ? 'checked' : ''}> Solo alternativas del mismo patrón</label>` : ''}</div>`;
  }

  function filtered() {
    const q = ui.q.trim().toLowerCase();
    return Store.allExercises().filter(e =>
      (!pickerCtx || !excluded().includes(e.id)) &&
      (ui.brand === 'all' || e.brand === ui.brand || (ui.brand === 'Mis máquinas' && e.custom)) &&
      (ui.muscle === 'all' || e.primary.includes(ui.muscle) || e.secondary.includes(ui.muscle)) &&
      (ui.load === 'all' || e.load === ui.load) &&
      (!pickerCtx || !pickerCtx.pattern || !ui.samePattern || e.pattern === pickerCtx.pattern) &&
      (!q || `${e.name} ${e.brand} ${e.line} ${PATTERNS[e.pattern]} ${e.primary.join(' ')}`.toLowerCase().includes(q)));
  }

  function listHTML(act) {
    const items = filtered();
    if (!items.length) return '<p class="muted">Nada encontrado. Puedes añadir tu propia máquina.</p>';
    return items.map(e => `<button class="list-item" data-act="${act}" data-id="${e.id}">${thumb(e.id, 'sm')}
      <div class="grow"><b>${esc(e.name)}</b><small>${esc(e.brand)}${e.line ? ' · ' + esc(e.line) : ''} · ${esc(e.primary.join(', '))}</small></div>
      ${excluded().includes(e.id) ? '<span class="tag bad">Evitar</span>' : ''}</button>`).join('');
  }

  function viewCatalog() {
    pickerCtx = null;
    return `<div class="section-head"><h2>Máquinas y ejercicios</h2><a class="btn small" href="#/nuevo-ejercicio">+ Añadir</a></div>
      ${filtersHTML(false)}<div id="list">${listHTML('open-ex')}</div>`;
  }

  function viewExercise(id) {
    const ex = Store.exercise(id), st = Store.exSettings(id), photo = S().photos[id];
    const hist = Progression.historyFor(id);
    const lastTarget = hist[0]?.target || Generator.targetFor(ex, S().profile?.goal, S().profile?.level);
    const sg = Progression.suggest(id, lastTarget);
    const best = hist.length ? Math.max(...hist.map(h => Progression.bestE1rm(h.sets))) : 0;
    let h = `<div class="card ex-detail">${photo ? `<div class="photo-big"><img src="${photo}" alt=""></div>` : Icons.tile(ex.pattern, 'xl')}
      <h2>${esc(ex.name)}</h2><p class="muted">${esc(ex.brand)}${ex.line ? ' · ' + esc(ex.line) : ''} · ${LOAD_TYPES[ex.load] || ''}${ex.unilateral ? ' · unilateral' : ''}</p>
      ${excluded().includes(id) ? '<p class="tag bad">Evitar: incompatible con tus restricciones</p>' : ''}
      <p><b>Patrón:</b> ${PATTERNS[ex.pattern]}<br><b>Principales:</b> ${esc(ex.primary.join(', '))}${ex.secondary.length ? `<br><b>Secundarios:</b> ${esc(ex.secondary.join(', '))}` : ''}</p>
      <div class="row gap"><label class="btn small file-btn">📷 ${photo ? 'Cambiar foto' : 'Foto de tu máquina'}<input type="file" accept="image/*" capture="environment" data-photo="${id}" hidden></label>
      ${photo ? `<button class="btn small ghost" data-act="del-photo" data-id="${id}">Quitar foto</button>` : ''}
      ${ex.custom ? `<button class="btn small ghost danger" data-act="del-custom" data-id="${id}">Borrar máquina</button>` : ''}
      <button class="btn small ghost" data-act="toggle-excl" data-id="${id}">${excluded().includes(id) ? '✅ Volver a permitir' : '⛔ Evitar este ejercicio'}</button></div></div>
      <div class="card demo-card"><h3>🎬 Cómo se hace</h3>${demoHTML(id)}<div class="row gap demo-links">${videoLink(id)}</div></div>
      <div class="card"><h3>Carga</h3><div class="rx-fields two">
        <label>Cómo anoto el peso<select data-exs="mode" data-id="${id}">${Object.entries(Store.MODES).map(([k, v]) => `<option value="${k}" ${st.mode === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        ${st.mode === 'goma' || st.mode === 'tiempo' ? '' : `<label>Subida mínima (${st.label})<input type="number" step="0.25" inputmode="decimal" data-exs="increment" data-id="${id}" value="${st.increment}"></label>`}</div>
        <p class="muted small">${st.mode === 'goma' ? `Anotas el color de la goma. Orden de suave a dura: ${Object.values(BANDS).map(b => b.dot + ' ' + b.label.toLowerCase()).join(' → ')} (puede variar según la marca).`
          : st.mode === 'tiempo' ? 'Eliges los segundos de cada serie y la app hace la cuenta atrás.'
          : 'Ajusta la subida al salto real de la máquina (p. ej. 1,25 si tienes discos pequeños, o el salto entre placas).'}</p>
        ${Store.WARMUP_MODES.includes(st.mode) ? `<label class="check-row"><input type="checkbox" data-exs-wu data-id="${id}" ${st.warmup ? 'checked' : ''}> 🔥 Series de aproximación (50 % × 8 y 75 % × 4)</label>` : ''}</div>
      <div class="sug ${sg.type}">${sugIcon(sg.type)} ${esc(sg.msg)}</div>`;
    const alts = Generator.alternatives(id);
    if (alts.length) h += `<div class="card"><h3>Alternativas</h3><p class="muted small">Trabajan lo mismo, por si la máquina está ocupada.</p>
      ${alts.map(e => `<a class="list-item" href="#/ejercicio/${e.id}">${thumb(e.id, 'sm')}<div class="grow"><b>${esc(e.name)}</b>
        <small>${esc(e.brand)}${e.line ? ' · ' + esc(e.line) : ''} · ${esc(e.primary.join(', '))}</small></div></a>`).join('')}</div>`;
    h += progressCard(id, hist, st);
    const recent = hist.slice(0, 10), sore = recent.filter(x => x.pain.length);
    if (sore.length) {
      const areas = [...new Set(sore.flatMap(x => x.pain))];
      h += `<div class="card warn-soft">⚠️ Molestias en <b>${sore.length} de tus últimas ${recent.length} sesiones</b> (${esc(painTxt(areas))}).
        ${sore.length >= 2 ? 'Si se repite, prueba una alternativa o baja la carga.' : ''}</div>`;
    }
    h += `<div class="card"><h3>Historial</h3>${best ? `<p>Mejor 1RM estimado: <b>${best.toFixed(1)} ${st.label}</b></p>` : ''}
      ${hist.length ? hist.map(x => `<div class="hist-row"><span>${fmtDate(x.date)}</span><span>${x.sets.map(s => esc(Progression.fmtSet(id, s))).join(' · ')}${
        x.pain.length || x.memo ? `<small class="memo-line">${x.pain.length ? `⚠️ ${esc(painTxt(x.pain))}` : '📝'}${x.memo ? ' · ' + esc(x.memo) : ''}</small>` : ''}</span></div>`).join('') : '<p class="muted">Sin registros todavía.</p>'}</div>`;
    return h;
  }

  // Progreso de un ejercicio: 1RM estimado (con peso) o segundos (por tiempo). Con goma no hay número que dibujar.
  function progressCard(id, hist, st) {
    if (st.mode === 'goma' || hist.length < 2) return '';
    const timed = st.mode === 'tiempo';
    const pts = hist.slice(0, 30).reverse().map(x => {
      const y = timed ? Math.max(...x.sets.map(s => Number(s.secs) || 0)) : Progression.bestE1rm(x.sets);
      return { x: x.date, y, tip: `${fmtDate(x.date)} · ${timed ? `${y} s` : `${fmtNum(y)} ${st.label}`}`, sub: x.sets.map(s => Progression.fmtSet(id, s)).join(' · ') };
    }).filter(p => p.y > 0);
    if (pts.length < 2) return '';
    const first = pts[0].y, last = pts[pts.length - 1].y, pct = Math.round((last / first - 1) * 100);
    return `<div class="card"><div class="row between"><h3>📈 Progreso</h3>${pct ? `<span class="delta-chip ${pct > 0 ? 'pos' : 'neg'}">${pct > 0 ? '▲' : '▼'} ${Math.abs(pct)} %</span>` : ''}</div>
      <p class="muted small">${timed ? 'Mejor tiempo de cada sesión' : `1RM estimado de cada sesión (${st.label}): sube aunque cambies de reps o de peso`}. Toca la gráfica para ver cada día.</p>
      ${lineChart(pts, v => timed ? `${Math.round(v)} s` : fmtNum(v))}</div>`;
  }

  // Gráfica de línea de una serie: línea de 2 px, puntos con anillo, rejilla tenue y valor solo en el último punto.
  // Al tocarla muestra el punto más cercano (ver el listener de pointerdown).
  function lineChart(pts, fmt) {
    const W = 320, H = 150, L = 38, R = 14, T = 14, B = 24;
    let lo = Math.min(...pts.map(p => p.y)), hi = Math.max(...pts.map(p => p.y));
    const pad = (hi - lo) * 0.15 || Math.max(1, hi * 0.05);
    lo = Math.max(0, lo - pad); hi += pad;
    const step = niceStep((hi - lo) / 3), y0 = Math.floor(lo / step) * step, y1 = Math.ceil(hi / step) * step;
    const x0 = pts[0].x, x1 = pts[pts.length - 1].x;
    const X = x => L + (x1 === x0 ? (W - L - R) / 2 : (x - x0) / (x1 - x0) * (W - L - R)), Y = y => T + (1 - (y - y0) / (y1 - y0)) * (H - T - B);
    const ticks = []; for (let v = y0; v <= y1 + step / 2; v += step) ticks.push(v);
    const line = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
    const area = `${line}L${X(x1).toFixed(1)},${Y(y0).toFixed(1)}L${X(x0).toFixed(1)},${Y(y0).toFixed(1)}Z`;
    const short = ts => new Date(ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' });
    const lp = pts[pts.length - 1];
    const data = pts.map(p => ({ x: +(X(p.x) / W * 100).toFixed(2), y: +(Y(p.y) / H * 100).toFixed(2), t: p.tip, s: p.sub || '' }));
    return `<div class="chart" data-pts="${esc(JSON.stringify(data))}"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfica de progreso">
      ${ticks.map(v => `<line class="c-grid" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="c-axis" x="${L - 6}" y="${Y(v) + 3.5}" text-anchor="end">${fmtNum(v)}</text>`).join('')}
      <text class="c-axis" x="${L}" y="${H - 6}">${short(x0)}</text><text class="c-axis" x="${W - R}" y="${H - 6}" text-anchor="end">${short(x1)}</text>
      <path class="c-area" d="${area}"/><path class="c-line" d="${line}"/>
      ${pts.map(p => `<circle class="c-dot" cx="${X(p.x)}" cy="${Y(p.y)}" r="4"/>`).join('')}
      <text class="c-val" x="${Math.min(X(lp.x), W - R)}" y="${Y(lp.y) - 10}" text-anchor="end">${fmt(lp.y)}</text></svg>
      <div class="c-hair"></div><div class="c-tip"></div></div>`;
  }
  const niceStep = raw => { const p = Math.pow(10, Math.floor(Math.log10(raw || 1))), n = raw / p; return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 2.5 ? 2.5 : n <= 5 ? 5 : 10) * p; };
  function chartPoint(ev) {
    const c = ev.target.closest('.chart');
    document.querySelectorAll('.chart.show').forEach(x => x !== c && x.classList.remove('show'));
    if (!c) return;
    const pts = JSON.parse(c.dataset.pts), r = c.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * 100;
    const p = pts.reduce((a, b) => Math.abs(b.x - px) < Math.abs(a.x - px) ? b : a);
    const tip = c.querySelector('.c-tip'), hair = c.querySelector('.c-hair');
    tip.innerHTML = `<b>${esc(p.t)}</b>${p.s ? `<small>${esc(p.s)}</small>` : ''}`;
    hair.style.left = p.x + '%'; hair.style.setProperty('--y', p.y + '%');
    tip.style.left = Math.min(Math.max(p.x, 22), 78) + '%';
    c.classList.add('show');
  }

  function viewNewExercise() {
    return `<div class="card"><h2>Nueva máquina o ejercicio</h2>
      <label>Nombre<input id="n-name" placeholder="p. ej. Remo T Hammer"></label>
      <label>Marca<input id="n-brand" value="Fitness Factory"></label>
      <label>Patrón de movimiento<select id="n-pattern">${Object.entries(PATTERNS).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label>Músculo principal<select id="n-muscle">${MUSCLES.map(m => `<option>${m}</option>`).join('')}</select></label>
      <label>Tipo de carga<select id="n-load">${Object.entries(LOAD_TYPES).map(([k, v]) => `<option value="${k}">${v}</option>`).join('')}</select></label>
      <label class="check-row"><input type="checkbox" id="n-compound"> Multiarticular (básico)</label>
      <label class="check-row"><input type="checkbox" id="n-uni"> Unilateral / iso-lateral</label>
      <button class="btn primary block" data-act="save-custom">Guardar</button></div>`;
  }

  const sugIcon = t => ({ up: '⬆️', keep: '➡️', stall: '⚠️', down: '⬇️', first: '🆕', deload: '🔋' }[t] || '');

  function viewWorkout() {
    const w = S().activeWorkout;
    if (!w) {
      const r = activeRoutine();
      if (!r) return `<div class="card"><p>No tienes una rutina activa.</p><a class="btn primary" href="#/generar">Crear rutina</a></div>`;
      const next = nextDayIndex(r);
      return `<h2>¿Qué toca hoy?</h2>${r.days.map((d, i) => `<button class="card day btn-card ${i === next ? 'next' : ''}" data-act="start" data-day="${i}">
        <div class="day-ic">${d.icon || '🏋️'}</div><div class="grow"><b>${esc(d.name)}</b><small>${lastDone(r, i) ? agoTxt(lastDone(r, i)) : 'sin hacer aún'}${i === next ? ' · <span class="hl">siguiente</span>' : ''}</small></div><span class="chev">›</span></button>`).join('')}
        <div class="section-head"><h2>O algo distinto</h2></div><div class="quick">` +
        Object.entries(Quick.TYPES).map(([k, t]) => `<button class="qcard g-${t.grad}" data-act="quick" data-type="${k}"><span class="qi">${t.icon}</span><b>${t.label}</b><small>${t.desc}</small></button>`).join('') + '</div>';
    }
    if (w.type === 'hiit') return viewHiit(w);
    let h = `<div class="workout-head"><div class="day-ic">${workoutIcon(w)}</div><div class="grow"><h2>${esc(w.dayName)}</h2>
      <small>${w.past ? `📅 ${fmtDate(w.start)} · ${w.past} min` : `⏱ <span id="elapsed">${fmtDur(Date.now() - w.start)}</span>`}</small></div>
      <button class="btn primary" data-act="finish">${w.past ? 'Guardar' : 'Terminar'}</button></div><div id="msg"></div>`;
    if (w.past) h += `<div class="card past-note">📅 Estás anotando un entreno pasado: rellena lo que hiciste y marca ✓ cada serie. Sin descansos ni cronómetro.</div>`;
    const notes = routineById(w.routineId)?.notes;
    if (notes) h += `<details class="card notes"><summary>📝 Notas de la rutina</summary><p>${esc(notes).replace(/\n/g, '<br>')}</p></details>`;
    w.exercises.forEach((e, ei) => { h += exerciseCard(e, ei); });
    const hasCore = w.exercises.some(e => Store.exercise(e.exId).pattern === 'core');
    if (!hasCore && !w.coreAsked && ['rutina', 'fullbody', 'pierna', 'torso'].includes(w.type || 'rutina')) {
      h += `<div class="card core-offer"><div class="pict g-core sm">${Icons.svg('core')}</div><div class="grow"><b>¿Cierras con core?</b>
        <small>3 ejercicios · ~6 min</small></div>
        <div class="row gap"><button class="btn small primary" data-act="add-core">Añadir</button><button class="btn small ghost" data-act="skip-core">Hoy no</button></div></div>`;
    }
    h += `<a class="btn block ghost" href="#/elegir/workout/0">+ Añadir ejercicio</a>
      <button class="btn block ghost danger" data-act="discard">Descartar entreno</button>`;
    return h;
  }

  function swapPanel(e, ei) {
    const alts = Generator.alternatives(e.exId, 6, S().activeWorkout.exercises.map(x => x.exId));
    const items = alts.map(x => {
      const last = Progression.historyFor(x.id)[0];
      const info = last ? `Última vez: ${fmtNum(Progression.topWeight(last.sets))} ${Store.exSettings(x.id).label}` : esc(x.primary.join(', '));
      return `<button class="list-item" data-act="swap-to" data-ei="${ei}" data-id="${x.id}">${thumb(x.id, 'sm')}
        <div class="grow"><b>${esc(x.name)}</b><small>${esc(x.brand)}${x.line ? ' · ' + esc(x.line) : ''} · ${info}</small></div>
        ${last ? '<span class="tag ok">Ya la usas</span>' : ''}</button>`;
    }).join('');
    return `<div class="swap-panel"><p class="small"><b>¿Máquina ocupada?</b> Alternativas que trabajan lo mismo · solo para hoy</p>
      ${items || '<p class="muted small">No hay alternativas del mismo patrón.</p>'}
      <a class="btn small ghost block" href="#/elegir/workout/0/${ei}">Ver todas las opciones</a></div>`;
  }

  // Cambia un ejercicio del entreno de hoy por otro (la rutina no se toca).
  function swapWorkoutEx(ei, newId) {
    const w = S().activeWorkout, old = w.exercises[ei];
    if (old.sets.some(s => s.done) && !confirm('Ya has marcado series de este ejercicio. ¿Cambiarlo igualmente? Se perderán.')) return false;
    const ex = newWorkoutEx(newId, old.target, { note: '', superset: old.superset });
    ex.swappedFrom = old.swappedFrom || old.exId;
    if (ex.swappedFrom === newId) delete ex.swappedFrom;
    w.exercises[ei] = ex;
    swapOpen = null;
    save();
    toast(`⇄ ${Store.exercise(newId).name}`);
    return true;
  }

  function exerciseCard(e, ei) {
    const ex = Store.exercise(e.exId), st = Store.exSettings(e.exId), t = e.target, sg = e.suggestion;
    const prev = Progression.historyFor(e.exId)[0];
    const prevTxt = prev ? prev.sets.map(s => Progression.fmtSet(e.exId, s)).join(' · ') : '—';
    const allDone = e.sets.length && e.sets.every(s => s.done);
    const list = S().activeWorkout.exercises, nextEx = e.superset && list[ei + 1], prevSS = ei > 0 && list[ei - 1].superset;
    const ssBadge = nextEx ? `<div class="ss">🔗 Superserie con <b>${esc(Store.exercise(nextEx.exId).name)}</b> · sin descanso entre ambos</div>`
      : prevSS ? '<div class="ss">🔗 2ª parte de la superserie · ahora sí, descansa</div>' : '';
    const hasMemo = (e.pain || []).length || e.memo;
    // Lo que anotaste la última vez (molestias o notas), en una sola línea.
    const lastMemo = prev && (prev.pain.length || prev.memo) ? `<div class="memo-last">${prev.pain.length ? `⚠️ La última vez: molestia de ${esc(painTxt(prev.pain))}` : '📝 La última vez'}${prev.memo ? ` · «${esc(prev.memo)}»` : ''}</div>` : '';
    const warm = e.warmup?.length ? `<div class="warmup"><span>🔥 Aproximación</span>${e.warmup.map((s, wi) => { const kg = warmupKg(e, s);
      return `<button class="wu ${s.done ? 'on' : ''}" data-act="wu" data-ei="${ei}" data-wi="${wi}">${kg ? `${fmtNum(kg)} ${st.label}` : `${s.pct} %`} × ${s.reps}</button>`; }).join('')}</div>` : '';
    return `<section class="card ex ${allDone ? 'complete' : ''} ${nextEx ? 'ss-top' : ''} ${prevSS ? 'ss-bottom' : ''}">${ssBadge}
      <div class="rx-head">${thumb(e.exId)}<div class="grow"><a href="#/ejercicio/${e.exId}"><h3>${esc(ex.name)}</h3></a><small>${esc(ex.brand)}${ex.line ? ' · ' + esc(ex.line) : ''}</small></div>
        <button class="memo-btn ${memoOpen === ei ? 'open' : hasMemo ? 'on' : ''}" data-act="memo-open" data-ei="${ei}" title="Molestias o anotación">📝</button>
        <button class="swap-btn ${swapOpen === ei ? 'on' : ''}" data-act="swap-open" data-ei="${ei}" title="Cambiar de máquina">⇄</button>
        <button class="icon" data-act="rm-wex" data-ei="${ei}" title="Quitar">✕</button></div>
      ${swapOpen === ei ? swapPanel(e, ei) : ''}
      ${memoOpen === ei ? memoPanel(e, ei) : hasMemo ? `<div class="memo-line">${(e.pain || []).length ? `⚠️ ${esc(painTxt(e.pain))}` : ''}${(e.pain || []).length && e.memo ? ' · ' : ''}${esc(e.memo || '')}</div>` : ''}
      ${e.swappedFrom ? `<div class="swapped">⇄ Hoy en lugar de ${esc(Store.exercise(e.swappedFrom).name)}</div>` : ''}
      ${lastMemo}
      <div class="target">${st.mode === 'tiempo' ? `<span>${t.sets} × ${fmtRest(Number(t.secs) || 30)}</span>`
        : `<span>${t.sets} × ${t.repMin}–${t.repMax}</span><span>RIR ${t.rir}</span>`}<span>⏱ ${fmtRest(t.rest)}</span></div>
      ${e.note ? `<div class="note">📝 ${esc(e.note)}</div>` : ''}
      ${demoOpen === ei ? `<div class="demo-inline">${demoHTML(e.exId)}<div class="row gap demo-links">${videoLink(e.exId)}<button class="btn small ghost" data-act="demo-open" data-ei="${ei}">Ocultar</button></div></div>`
        : `<button class="demo-btn" data-act="demo-open" data-ei="${ei}">🎬 Cómo se hace</button>`}
      <div class="sug ${sg.type}">${sugIcon(sg.type)} ${esc(sg.msg)}</div>
      <div class="prev">Anterior: ${esc(prevTxt)}</div>${warm}
      <table class="sets ${st.mode === 'tiempo' ? 'hold' : st.mode === 'goma' ? 'band' : ''}">${setRows(e, ei, st.mode)}</table>
      <div class="row gap"><button class="btn small ghost" data-act="add-set" data-ei="${ei}">+ Serie</button>
      <button class="btn small ghost" data-act="del-set" data-ei="${ei}">− Serie</button></div></section>`;
  }

  // Panel compacto: molestias con un toque y una línea de texto libre.
  function memoPanel(e, ei) {
    const on = e.pain || [];
    return `<div class="memo-panel"><div class="pain-chips">${Object.entries(PAIN).map(([k, v]) =>
      `<button class="chip sm ${on.includes(k) ? 'on' : ''}" data-act="pain" data-ei="${ei}" data-p="${k}">${v}</button>`).join('')}</div>
      <input data-memo="${ei}" value="${esc(e.memo || '')}" placeholder="Anotación: técnica, sensaciones, ajuste…" maxlength="140"></div>`;
  }

  // Filas de series: peso (kg + reps + RIR), goma (color + reps + RIR) o tiempo (segundos + cuenta atrás).
  function setRows(e, ei, mode) {
    const t = e.target, sg = e.suggestion, st = Store.exSettings(e.exId);
    const a = i => `data-ei="${ei}" data-si="${i}"`;
    const row = (s, si, cells) => `<tr class="${s.done ? 'done' : ''} ${justDone === `${ei}-${si}` ? 'just' : ''}"><td>${si + 1}</td>${cells}
      <td><button class="check" data-act="toggle-set" ${a(si)} aria-label="Serie hecha">✓</button></td></tr>`;
    const repsRir = (s, si) => `<td><input type="number" inputmode="numeric" data-f="reps" ${a(si)} value="${esc(s.reps)}" placeholder="${sg.reps || t.repMin}"></td>
      <td><input type="number" inputmode="numeric" data-f="rir" ${a(si)} value="${esc(s.rir)}" placeholder="${t.rir}"></td>`;
    if (mode === 'tiempo') return `<thead><tr><th>#</th><th>Tiempo</th><th></th><th></th></tr></thead><tbody>` +
      e.sets.map((s, si) => row(s, si, `<td><select data-f="secs" ${a(si)}>${secsOptions(s.secs)}</select></td>
        <td><button class="hold-btn ${holdOn === `${ei}-${si}` ? 'on' : ''}" data-act="hold" ${a(si)} aria-label="Cuenta atrás">▶</button></td>`)).join('') + '</tbody>';
    if (mode === 'goma') return `<thead><tr><th>#</th><th>Goma</th><th>Reps</th><th>RIR</th><th></th></tr></thead><tbody>` +
      e.sets.map((s, si) => row(s, si, `<td><select data-f="band" ${a(si)}>${bandOptions(s.band)}</select></td>${repsRir(s, si)}`)).join('') + '</tbody>';
    return `<thead><tr><th>#</th><th>${st.label}</th><th>Reps</th><th>RIR</th><th></th></tr></thead><tbody>` +
      e.sets.map((s, si) => row(s, si, `<td><input type="number" inputmode="decimal" step="any" data-f="kg" ${a(si)} value="${esc(s.kg)}"></td>${repsRir(s, si)}`)).join('') + '</tbody>';
  }

  // ---------- HIIT ----------
  const Hiit = { idx: -1, endAt: 0, left: 0, running: false, int: null, audio: null };
  function hiitPlan(w) {
    const H = w.hiit, list = [{ kind: 'prep', secs: 10 }];
    for (let r = 0; r < H.rounds; r++) {
      w.exercises.forEach((e, ei) => {
        list.push({ kind: 'work', secs: H.work, ei, round: r });
        if (!(r === H.rounds - 1 && ei === w.exercises.length - 1)) list.push({ kind: 'rest', secs: H.rest });
      });
    }
    return list;
  }
  function viewHiit(w) {
    const plan = hiitPlan(w), cur = plan[Hiit.idx], done = Hiit.idx >= plan.length;
    const nextWork = plan.slice(Math.max(0, Hiit.idx + 1)).find(p => p.kind === 'work');
    const curEx = cur?.kind === 'work' ? w.exercises[cur.ei] : nextWork ? w.exercises[nextWork.ei] : null;
    const phase = done ? '¡Hecho!' : Hiit.idx < 0 ? 'Listo' : { prep: 'Prepárate', work: '¡Dale!', rest: 'Descansa' }[cur.kind];
    const totalMin = Math.round(plan.reduce((a, p) => a + p.secs, 0) / 60);
    const workDone = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length, 0);
    return `<div class="workout-head"><div class="day-ic">🔥</div><div class="grow"><h2>HIIT</h2>
        <small>${w.hiit.rounds} rondas · ${w.hiit.work}/${w.hiit.rest} s · ~${totalMin} min</small></div>
        <button class="btn primary" data-act="finish">Terminar</button></div><div id="msg"></div>
      <div class="card hiit ${cur?.kind || ''} ${done ? 'fin' : ''}">
        <div class="ring"><svg viewBox="0 0 120 120"><circle class="ring-bg" cx="60" cy="60" r="52"/><circle id="h-ring" class="ring-fg" cx="60" cy="60" r="52" pathLength="100" style="stroke-dashoffset:${cur && !done ? 100 - (Hiit.left / cur.secs) * 100 : 0}"/></svg>
          <div class="ring-txt"><b id="h-time">${done ? '🔥' : Hiit.idx < 0 ? w.hiit.work : Math.ceil(Hiit.left)}</b><span>${phase}</span></div></div>
        ${curEx && !done ? `<div class="hiit-ex">${thumb(curEx.exId)}<div><small>${cur?.kind === 'work' ? 'Ahora' : 'Siguiente'}</small><b>${esc(Store.exercise(curEx.exId).name)}</b>
          ${curEx.note ? `<small>${esc(curEx.note)}</small>` : ''}</div></div>` : ''}
        <p class="muted">Ronda ${Math.min(w.hiit.rounds, (cur?.round ?? (nextWork?.round ?? 0)) + 1)} de ${w.hiit.rounds} · ${workDone} intervalos hechos</p>
        ${done ? '' : `<div class="row gap center"><button class="btn primary big" data-act="hiit-toggle">${Hiit.running ? '⏸ Pausa' : Hiit.idx < 0 ? '▶ Empezar' : '▶ Seguir'}</button>
          ${Hiit.idx >= 0 ? '<button class="btn ghost" data-act="hiit-skip">⏭ Saltar</button>' : ''}</div>`}
      </div>
      <div class="card"><h3>Circuito</h3>${w.exercises.map(e => `<div class="rx-head hiit-row">${thumb(e.exId, 'sm')}<div class="grow"><b>${esc(Store.exercise(e.exId).name)}</b></div>
        <span class="dots">${e.sets.map(s => `<i class="${s.done ? 'on' : ''}"></i>`).join('')}</span></div>`).join('')}
        <p class="muted small">Calienta 3–5 min antes. Sin impacto: cambia saltos por sentadilla rápida.</p></div>
      <button class="btn block ghost danger" data-act="discard">Descartar entreno</button>`;
  }
  function beep(freq = 880, dur = 0.12) {
    try {
      Hiit.audio = Hiit.audio || new (window.AudioContext || window.webkitAudioContext)();
      const o = Hiit.audio.createOscillator(), g = Hiit.audio.createGain();
      o.frequency.value = freq; g.gain.value = 0.15;
      o.connect(g); g.connect(Hiit.audio.destination);
      o.start(); o.stop(Hiit.audio.currentTime + dur);
    } catch (e) { /* sin audio */ }
  }
  function hiitAdvance() {
    const w = S().activeWorkout, plan = hiitPlan(w), cur = plan[Hiit.idx];
    if (cur?.kind === 'work') { w.exercises[cur.ei].sets[cur.round].done = true; save(); }
    Hiit.idx++;
    if (Hiit.idx >= plan.length) {
      Hiit.running = false; clearInterval(Hiit.int);
      navigator.vibrate && navigator.vibrate([400, 150, 400, 150, 400]); beep(660, 0.5);
    } else {
      Hiit.left = plan[Hiit.idx].secs; Hiit.endAt = Date.now() + Hiit.left * 1000;
      navigator.vibrate && navigator.vibrate(plan[Hiit.idx].kind === 'work' ? [250] : [120, 80, 120]);
      beep(plan[Hiit.idx].kind === 'work' ? 1040 : 520, 0.25);
    }
    render(true);
  }
  function hiitTick() {
    const w = S().activeWorkout;
    if (!w || w.type !== 'hiit' || !Hiit.running) return;
    const plan = hiitPlan(w), cur = plan[Hiit.idx];
    const prev = Math.ceil(Hiit.left);
    Hiit.left = Math.max(0, (Hiit.endAt - Date.now()) / 1000);
    const secs = Math.ceil(Hiit.left);
    if (secs !== prev && secs <= 3 && secs > 0) beep(760, 0.08);
    const t = document.getElementById('h-time'), ring = document.getElementById('h-ring');
    if (t) t.textContent = secs;
    if (ring) ring.style.strokeDashoffset = 100 - (Hiit.left / cur.secs) * 100;
    if (Hiit.left <= 0) hiitAdvance();
  }

  // ---------- resumen ----------
  function viewSummary(id) {
    const w = S().workouts.find(x => x.id === id);
    if (!w) return '<p>Entreno no encontrado.</p>';
    const kg = Nutrition.lifted(w);
    let h = `<div class="card hero sum"><div class="day-ic big">${workoutIcon(w)}</div><h2>${esc(w.dayName)}</h2>
      <p class="muted">${fmtDate(w.start)} · ${fmtDur(w.end - w.start)}</p>
      <a class="btn small ghost edit-w" href="#/editar/${w.id}">✏️ Corregir pesos, series o fecha</a>`;
    const cy = Cycle.at(w.start);
    if (cy) h += `<a class="cycle-chip small ${cy.phase ? 'ph-' + cy.phase : ''}" href="#/ciclo">${cy.phase ? Cycle.PHASES[cy.phase].icon : '🌙'} ${Cycle.label(cy)}</a>`;
    if (kg > 0) {
      const c = Nutrition.compare(kg);
      const prev = S().workouts.filter(x => x.id !== w.id && x.start < w.start && (x.dayName === w.dayName || (w.routineId && x.routineId === w.routineId && x.dayIndex === w.dayIndex)))
        .sort((a, b) => b.start - a.start)[0];
      const diff = prev ? Math.round((kg / (Nutrition.lifted(prev) || kg) - 1) * 100) : null;
      h += `<p class="lift-label">Hoy has levantado</p><div class="lift"><b data-count="${Math.round(kg)}">0</b> kg</div>
        <p class="lift-cmp">¡El peso de <b>${fmtNum(c.count)} ${c.name}</b>!</p>
        <div class="emojis">${Array.from({ length: c.icons }, (_, i) => `<span style="animation-delay:${0.6 + i * 0.12}s">${c.emoji}</span>`).join('')}</div>
        ${diff !== null && diff !== 0 ? `<p class="delta ${diff > 0 ? 'pos' : 'neg'}">${diff > 0 ? '▲' : '▼'} ${Math.abs(diff)} % vs. la última vez</p>` : ''}`;
    } else if (w.type === 'hiit') {
      const secs = w.exercises.reduce((a, e) => a + e.sets.filter(s => s.done).length * (w.hiit?.work || 40), 0);
      h += `<p class="lift-label">Trabajo a tope</p><div class="lift"><b data-count="${Math.round(secs / 60)}">0</b> min</div><div class="emojis"><span>🔥</span><span>🔥</span><span>🔥</span></div>`;
    }
    // ¿Este entreno ha completado la semana? (justo el que llega al objetivo, no los siguientes)
    const wk = weekStart(w.start), goal = weekGoal();
    const before = weekDays(w.start - 1)(wk), after = weekDays(w.end || w.start)(wk);
    if (before < goal && after >= goal && !S().workouts.some(x => x.id !== w.id && startOfDay(x.start) === startOfDay(w.start) && x.start < w.start)) {
      const s = streak();
      h += `<div class="week-done">🔥 <b>¡Semana cumplida!</b>${wk === weekStart(Date.now()) && s.cur > 1 ? ` Llevas <b>${s.cur} semanas seguidas</b>.` : ` ${goal} de ${goal} días.`}</div>`;
    }
    const fresh = medalsFrom(w);
    if (fresh.length) h += `<div class="new-medals">${fresh.map(m => `<a class="new-medal" href="#/logros"><span class="mi">${m.icon}</span><div><small>¡Medalla nueva!</small><b>${m.name}</b><small>${m.desc}</small></div></a>`).join('')}</div>`;
    h += `<div class="stats inner"><div><b>${doneSets(w)}</b><small>series</small></div><div><b>${w.exercises.length}</b><small>ejercicios</small></div><div><b>${fmtDur(w.end - w.start)}</b><small>duración</small></div></div></div>`;

    h += energyCard(w);
    h += `<div class="card"><label class="kcal">🔥 Kcal que marca tu reloj<input type="number" inputmode="numeric" data-kcal="${w.id}" value="${esc(w.kcal)}" placeholder="p. ej. 320"></label>
      <div id="nutri">${nutritionHTML(w)}</div></div>`;

    if (w.type !== 'hiit') {
      h += '<div class="section-head"><h2>Próxima sesión</h2></div>';
      w.exercises.forEach(e => {
        const ex = Store.exercise(e.exId), st = Store.exSettings(e.exId);
        const older = Progression.historyFor(e.exId).filter(x => x.date < w.start);
        const pr = w.type !== 'descarga' && older.length && Progression.bestE1rm(e.sets) > Math.max(...older.map(x => Progression.bestE1rm(x.sets)));
        const sg = Progression.suggest(e.exId, e.target);
        h += `<div class="card ex-sum"><div class="rx-head">${thumb(e.exId, 'sm')}<div class="grow"><b>${esc(ex.name)}</b>
          <small>${e.sets.map(s => esc(Progression.fmtSet(e.exId, s))).join(' · ')}</small></div>${pr ? '<span class="tag gold">🏆 Récord</span>' : ''}</div>
          ${e.pain?.length || e.memo ? `<div class="memo-line">${e.pain?.length ? `⚠️ ${esc(painTxt(e.pain))}` : '📝'}${e.memo ? ' · ' + esc(e.memo) : ''}</div>` : ''}
          <div class="sug ${sg.type}">${sugIcon(sg.type)} ${esc(sg.msg)}</div></div>`;
      });
    }
    h += `<div class="card ai-sum"><h3>📋 Resumen en texto</h3>
      <p class="muted small">Para copiarlo y pegarlo en tu asistente de IA (ChatGPT, Claude…).</p>
      <textarea id="sum-text" rows="8" readonly>${esc(summaryText(w))}</textarea>
      <div class="row gap"><button class="btn primary" data-act="copy-summary">Copiar</button>
      ${navigator.share ? '<button class="btn ghost" data-act="share-summary">Compartir…</button>' : ''}</div></div>`;
    return h + `<button class="btn block ghost danger" data-act="del-workout" data-id="${w.id}">Borrar este entreno</button>`;
  }

  // Resumen del entreno en texto plano, pensado para un asistente de IA.
  function summaryText(w) {
    const date = new Date(w.start).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    const time = new Date(w.start).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
    const r = routineById(w.routineId), kg = Math.round(Nutrition.lifted(w));
    const L = [`Entreno GymLog · ${date}, ${time}`, `Sesión: ${w.dayName}${r ? ` (rutina "${r.name}")` : ''}`,
      `Duración: ${fmtDur(w.end - w.start)} · ${doneSets(w)} series · ${w.exercises.length} ejercicios` +
      (kg ? ` · ${kg.toLocaleString('es-ES')} kg movidos en total` : '') + (w.kcal ? ` · ${w.kcal} kcal (reloj)` : '')];
    if (w.energy) L.push(`Sensación: ${Cycle.ENERGY[w.energy].label.replace(/[¡!]/g, '').toLowerCase()} (${w.energy}/4)`);
    const cy = S().cycle.share && Cycle.at(w.start);
    if (cy) L.push(`Ciclo menstrual: ${Cycle.label(cy).toLowerCase()}`);
    if (w.type === 'hiit') L.push(`HIIT: ${w.hiit?.rounds} rondas de ${w.hiit?.work} s trabajo / ${w.hiit?.rest} s descanso`);
    w.exercises.forEach((e, i) => {
      const ex = Store.exercise(e.exId), st = Store.exSettings(e.exId), t = e.target || {};
      const goal = w.type === 'hiit' ? '' : st.mode === 'tiempo' ? `${t.sets} × ${Number(t.secs) || 30} s`
        : `${t.sets} × ${t.repMin}–${t.repMax} reps, RIR ${t.rir}`;
      L.push('', `${i + 1}. ${ex.name}${ex.brand && ex.brand !== 'Genérico' ? ` (${ex.brand}${ex.line ? ' ' + ex.line : ''})` : ''}${goal ? ` · objetivo ${goal}` : ''}`);
      if (e.swappedFrom) L.push(`   Hoy en lugar de: ${Store.exercise(e.swappedFrom).name}`);
      if (e.superset) L.push(`   En superserie con el siguiente`);
      if (w.type === 'hiit') L.push(`   ${e.sets.filter(s => s.done).length} intervalos hechos`);
      else {
        if (e.warmup?.length) L.push(`   Aproximación: ${e.warmup.map(s => `${fmtNum(s.kg)} ${st.label} × ${s.reps}`).join(' | ')}`);
        L.push(`   Series: ${e.sets.map(s => Progression.fmtSet(e.exId, s)).join(' | ')}`);
        if (w.type !== 'descarga' && Progression.historyFor(e.exId)[0]?.workoutId === w.id) L.push(`   Próxima vez: ${Progression.suggest(e.exId, t).msg}`);
      }
      if (e.note) L.push(`   Nota: ${e.note}`);
      if (e.pain?.length) L.push(`   Molestia: ${painTxt(e.pain)}`);
      if (e.memo) L.push(`   Anotación: ${e.memo}`);
    });
    L.push('', 'Leyenda: "@2" = RIR (reps que me quedaban en reserva). "kg/lado" = discos por lado.');
    return L.join('\n');
  }

  function nutritionHTML(w) {
    const n = Nutrition.advice(w);
    return `<h3>🍽️ Qué comer hoy</h3><p class="muted small">Demanda de la sesión: <b>${n.label}</b></p>
      ${n.kcal ? `<p class="kcal-note">${esc(n.kcal)}</p>` : ''}
      <h4>Después de entrenar</h4><ul>${n.post.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      <div class="meals">${n.meals.map(m => `<span>${esc(m)}</span>`).join('')}</div>
      <h4>Durante el día</h4><ul>${n.day.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
      ${n.needsBody ? '<p class="muted small">Completa <a class="link" href="#/ajustes">tus datos</a> (sexo, edad, peso y altura) para ver tus calorías y gramos exactos.</p>' : ''}
      <p class="muted small">Orientativo: no sustituye a un dietista-nutricionista.</p>`;
  }

  function viewHistory() {
    const ws = S().workouts.slice().sort((a, b) => b.start - a.start);
    const pastBtn = '<a class="btn block ghost" href="#/pasado">📅 Registrar un entreno de otro día</a>';
    if (!ws.length) return '<p class="muted">Todavía no has registrado entrenos.</p>' + pastBtn;
    const c = S().cycle;
    const cyLink = c.enabled && !c.hormonal && !c.irregular ? `<a class="card row between nudge" href="#/ciclo"><div class="grow"><b>📊 Tu patrón del ciclo</b>
      <small>Tu energía y tus récords en cada fase</small></div><span class="chev">›</span></a>` : '';
    const m = monthStats(monthKey(Date.now())), waist = series('waist').pop();
    const links = `<div class="link-grid"><a class="card nudge" href="#/mes"><b>📅 ${monthName(monthKey(Date.now()))[0].toUpperCase() + monthName(monthKey(Date.now())).slice(1)}</b>
        <small>${m.ws.length} ${m.ws.length === 1 ? 'entreno' : 'entrenos'} · resumen</small></a>
      <a class="card nudge" href="#/medidas"><b>📏 Medidas</b><small>${waist ? `Cintura ${fmtNum(waist.v)} cm` : 'Cintura, peso…'}</small></a></div>`;
    return links + weekVolumeCard() + groupProgressCard() + cyLink + `<div class="section-head"><h2>Historial</h2></div>` + pastBtn + ws.map(w => {
      const kg = Nutrition.lifted(w);
      return `<a class="list-item" href="#/resumen/${w.id}"><div class="day-ic sm">${workoutIcon(w)}</div><div class="grow"><b>${esc(w.dayName)}${w.energy ? ' ' + Cycle.ENERGY[w.energy].icon : ''}</b>
        <small>${fmtDate(w.start)} · ${fmtDur(w.end - w.start)} · ${doneSets(w)} series${kg ? ` · ${fmtNum(Math.round(kg))} kg` : ''}${w.kcal ? ` · ${w.kcal} kcal` : ''}</small></div><span class="chev">›</span></a>`;
    }).join('');
  }

  const ymd = ts => { const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
  const hhmm = ts => new Date(ts).toTimeString().slice(0, 5);

  function viewPast() {
    const r = activeRoutine();
    return `<div class="card"><h2>📅 Entreno de otro día</h2>
      <p class="muted small">Para cuando entrenaste y no lo anotaste. Cuenta para tu historial, tu progresión y el día que te toca.</p>
      <div class="rx-fields two"><label>Fecha<input type="date" id="p-date" max="${ymd(Date.now())}" value="${ymd(Date.now() - 864e5)}"></label>
      <label>Hora<input type="time" id="p-time" value="18:00"></label>
      <label>Duración (min)<input type="number" inputmode="numeric" id="p-mins" value="45"></label></div></div>
      <div class="section-head"><h2>¿Qué hiciste?</h2></div>
      ${r ? r.days.map((d, i) => `<button class="card day btn-card" data-act="start-past" data-day="${i}"><div class="day-ic">${d.icon || '🏋️'}</div>
        <div class="grow"><b>${esc(d.name)}</b><small>${esc(r.name)} · ${d.exercises.length} ejercicios</small></div><span class="chev">›</span></button>`).join('') : ''}
      <button class="card day btn-card" data-act="start-past"><div class="day-ic">📝</div><div class="grow"><b>Entreno libre</b>
        <small>Eliges tú los ejercicios</small></div><span class="chev">›</span></button>`;
  }

  // Corregir un entreno ya guardado: fecha, duración y cada serie. Se guarda al cambiar cada campo.
  function viewEditWorkout(id) {
    const w = S().workouts.find(x => x.id === id);
    if (!w) return '<p>Entreno no encontrado.</p>';
    const a = (ei, si) => `data-wid="${w.id}" data-ei="${ei}" data-si="${si}"`;
    const num = (k, s, ei, si, dec) => `<td><input type="number" inputmode="${dec ? 'decimal' : 'numeric'}" ${dec ? 'step="any"' : ''} data-wf="${k}" ${a(ei, si)} value="${esc(s[k])}"></td>`;
    let h = `<div class="card"><h2>✏️ Corregir entreno</h2><p class="muted small">${esc(w.dayName)} · los cambios se guardan solos.</p>
      <div class="rx-fields two"><label>Fecha<input type="date" data-wd="date" data-wid="${w.id}" max="${ymd(Date.now())}" value="${ymd(w.start)}"></label>
      <label>Hora<input type="time" data-wd="time" data-wid="${w.id}" value="${hhmm(w.start)}"></label>
      <label>Duración (min)<input type="number" inputmode="numeric" data-wd="mins" data-wid="${w.id}" value="${Math.round((w.end - w.start) / 60000)}"></label></div></div>`;
    if (w.type !== 'hiit') w.exercises.forEach((e, ei) => {
      const st = Store.exSettings(e.exId), mode = st.mode;
      const head = mode === 'tiempo' ? '<th>Tiempo</th>' : `<th>${mode === 'goma' ? 'Goma' : st.label}</th><th>Reps</th><th>RIR</th>`;
      h += `<section class="card ex"><div class="rx-head">${thumb(e.exId, 'sm')}<div class="grow"><b>${esc(Store.exercise(e.exId).name)}</b></div>
        <button class="icon" data-act="wedit-rm-ex" data-wid="${w.id}" data-ei="${ei}" title="Quitar ejercicio">✕</button></div>
        <table class="sets ${mode === 'tiempo' ? 'hold' : mode === 'goma' ? 'band' : ''}"><thead><tr><th>#</th>${head}<th></th></tr></thead><tbody>${e.sets.map((s, si) => `<tr class="done"><td>${si + 1}</td>${
          mode === 'tiempo' ? `<td><select data-wf="secs" ${a(ei, si)}>${secsOptions(s.secs)}</select></td>`
          : (mode === 'goma' ? `<td><select data-wf="band" ${a(ei, si)}>${bandOptions(s.band)}</select></td>` : num('kg', s, ei, si, true)) + num('reps', s, ei, si) + num('rir', s, ei, si)}
          <td>${e.sets.length > 1 ? `<button class="icon" data-act="wedit-del-set" ${a(ei, si)} title="Borrar serie">✕</button>` : ''}</td></tr>`).join('')}</tbody></table>
        <button class="btn small ghost" data-act="wedit-add-set" data-wid="${w.id}" data-ei="${ei}">+ Serie</button></section>`;
    });
    return h + `<a class="btn block primary" href="#/resumen/${w.id}">Listo</a>`;
  }

  // Datos personales: en la bienvenida (ids w-*) o en Ajustes (se guardan al cambiar).
  function bodyFields(welcome) {
    const st = welcome ? {} : S().settings, p = welcome ? { goal: 'recomposicion', days: 4, level: 'intermedio' } : (S().profile || {});
    const at = k => welcome ? `id="w-${k}"` : `data-body="${k}"`;
    const opt = (obj, sel) => Object.entries(obj).map(([k, v]) => `<option value="${k}" ${k == sel ? 'selected' : ''}>${esc(v.label || v)}</option>`).join('');
    return `<div class="rx-fields two">
      <label>Sexo<select ${at('sex')}>${opt({ '': '—', mujer: 'Mujer', hombre: 'Hombre', otro: 'Prefiero no decirlo' }, st.sex)}</select></label>
      <label>Edad<input type="number" inputmode="numeric" ${at('age')} value="${esc(st.age)}" placeholder="años"></label>
      <label>Peso (kg)<input type="number" inputmode="decimal" step="0.1" ${at('bodyweight')} value="${esc(st.bodyweight)}" placeholder="kg"></label>
      <label>Altura (cm)<input type="number" inputmode="numeric" ${at('height')} value="${esc(st.height)}" placeholder="cm"></label>
      <label>Objetivo<select ${at('goal')}>${opt(Generator.GOALS, p.goal)}</select></label>
      <label>Días por semana<select ${at('days')}>${[2, 3, 4, 5, 6].map(n => `<option ${n == p.days ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
      <label>Nivel<select ${at('level')}>${opt(Generator.LEVELS, p.level)}</select></label></div>`;
  }
  function energyHTML() {
    const en = Nutrition.energy();
    if (!en) return '<p class="muted small">Con sexo, edad, peso y altura calculo tus calorías y proteína diarias orientativas.</p>';
    return `<div class="energy"><div><b>${en.target.toLocaleString('es-ES')}</b><small>kcal/día objetivo</small></div>
      <div><b>${en.protein[0]}–${en.protein[1]} g</b><small>proteína/día</small></div>
      <div><b>${en.tdee.toLocaleString('es-ES')}</b><small>gasto estimado</small></div></div>
      <p class="muted small">Estimación (Mifflin-St Jeor × actividad, ${Generator.GOALS[en.goal]?.label.toLowerCase() || ''}). Ajústala según cómo evolucione tu peso en 2–3 semanas.</p>`;
  }
  const BODY_SETTINGS = ['sex', 'age', 'bodyweight', 'height'];

  // Crea el perfil con lo rellenado en la bienvenida. Devuelve el nombre, o null si falta.
  function createUserFromWelcome() {
    const name = document.getElementById('w-name').value.trim();
    if (!name) { toast('Escribe tu nombre primero'); document.getElementById('w-name').focus(); return null; }
    const v = k => document.getElementById('w-' + k).value;
    const body = {}; BODY_SETTINGS.forEach(k => { body[k] = k === 'sex' ? v(k) : (v(k) === '' ? '' : Number(v(k))); });
    const profile = { goal: v('goal'), days: Number(v('days')), level: v('level') };
    Store.addUser(name, newAvatar);
    Object.assign(S().settings, body);
    S().profile = profile;
    save();
    newAvatar = AVATARS[0];
    Timer.stop();
    return name;
  }

  // Lee un archivo de rutina y lo importa en el perfil activo.
  function importRoutineFile(file, after) {
    file.text().then(txt => {
      try {
        const res = Store.importRoutinePack(JSON.parse(txt));
        toast({ added: `📥 ${res.routine.name} cargada`, updated: `✅ ${res.routine.name} actualizada`, same: `${res.routine.name} ya estaba al día` }[res.status]);
        after(res);
      } catch (e) { toast('No se pudo importar: ' + e.message); after(null); }
    });
  }
  function downloadJSON(obj, filename) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' }));
    a.download = filename;
    a.click();
  }

  function viewSettings() {
    const u = Store.currentUser();
    return `<a class="card row between" href="#/usuarios"><div class="day-ic">${u.avatar}</div><div class="grow" style="margin-left:12px"><b>${esc(u.name)}</b>
        <small>Perfil activo · cambiar o añadir persona</small></div><span class="chev">›</span></a>
      <div class="card" id="body-card"><h2>Mis datos</h2>${bodyFields(false)}<div id="energy">${energyHTML()}</div></div>
      ${cycleSettings()}
      <div class="card"><h2>Ajustes</h2>
      <label>Descanso por defecto (s)<input type="number" id="s-rest" value="${S().settings.restDefault}"></label>
      <label class="check-row"><input type="checkbox" id="s-awake" ${S().settings.keepAwake !== false ? 'checked' : ''}> Mantener la pantalla encendida durante el entreno</label></div>
      <details class="card howto"><summary><b>💡 Cómo sacarle partido</b><small>Consejos rápidos de uso</small></summary>
        ${HOWTO.map(([i, t, d]) => `<div class="howto-row"><span class="howto-ic">${i}</span><div><b>${t}</b><small>${d}</small></div></div>`).join('')}</details>
      <details class="card news"><summary><b>✨ Novedades</b><small>Lo último que ha llegado a la app</small></summary>${newsHTML(NEWS)}</details>
      <a class="card row between" href="#/medidas"><div class="grow"><b>📏 Medidas corporales</b><small>Cintura, peso, cadera, muslo: lo que quieras</small></div><span class="chev">›</span></a>
      <div class="card"><h3>Material de mi gimnasio</h3><p class="muted small">Marcas que salen en las alternativas, el generador y los entrenos rápidos.</p>
        ${Generator.BRANDS.map(b => `<label class="check-row"><input type="checkbox" class="s-brand" value="${b}" ${(S().profile?.brands || Generator.BRANDS).includes(b) ? 'checked' : ''}> ${b === 'Genérico' ? 'Peso libre, poleas, gomas y multipower' : b}</label>`).join('')}</div>
      <div class="card"><h3>Ejercicios a evitar</h3><p class="muted small">No saldrán en rutinas generadas ni entrenos rápidos. Puedes añadir más desde la ficha de cada ejercicio.</p>
        ${excluded().length ? excluded().map(id => `<div class="hist-row"><span>${esc(Store.exercise(id).name)}</span>
          <button class="btn small ghost" data-act="toggle-excl" data-id="${id}">Permitir</button></div>`).join('') : '<p class="muted">Ninguno.</p>'}</div>
      <div class="card"><h3>Copia de seguridad</h3><p class="muted small">Los datos de este perfil solo están en este móvil. Te lo recuerdo una vez al mes.
        ${S().settings.lastBackup ? `Última copia: <b>${agoTxt(S().settings.lastBackup)}</b>.` : 'Aún no has hecho ninguna.'}</p>
      <div class="row gap"><button class="btn" data-act="export">Exportar</button>
      <label class="btn file-btn">Importar<input type="file" accept="application/json,.json" id="import" hidden></label></div></div>
      <div class="card"><button class="btn ghost danger" data-act="reset">Borrar los datos de ${esc(u.name)}</button></div>
      <p class="muted small">Hammer Strength y Matrix son marcas de sus respectivos propietarios; esta app no está afiliada a ellas. Pictogramas propios. Ilustraciones de técnica: <a href="https://github.com/everkinetic/data" target="_blank" rel="noopener">Everkinetic</a> (CC BY-SA 4.0).</p>`;
  }

  // ---------- usuarios ----------
  const AVATARS = ['🏋️', '🏋️‍♀️', '🏋️‍♂️', '💪', '🦵', '🔥', '⚡', '🐺', '🦊', '🐻', '🦁', '🐼', '🌸', '⭐', '🚀', '🎯'];
  let newAvatar = AVATARS[0];
  function viewWelcome() {
    const first = !Store.getUsers().list.length;
    return `<div class="card hero welcome"><div class="day-ic big">🏋️</div>
      <h2>${first ? 'Bienvenido/a a GymLog' : 'Nueva persona'}</h2>
      <p class="muted">Cada persona tiene sus propias rutinas, historial y ajustes.</p></div>
      <div class="card"><label>¿Cómo te llamas?<input id="w-name" placeholder="Tu nombre" autocomplete="given-name"></label>
      <label>Elige un avatar</label><div class="avatars">${AVATARS.map(a => `<button class="${a === newAvatar ? 'on' : ''}" data-act="pick-avatar" data-a="${a}">${a}</button>`).join('')}</div></div>
      <div class="card"><h3>Tus datos</h3><p class="muted small">Opcionales. Sirven para calcular tus calorías y proteína y para generar tu rutina. Podrás cambiarlos en ⚙️ Ajustes.</p>
      ${bodyFields(true)}</div>
      <div class="section-head"><h2>¿Cómo quieres empezar?</h2></div>
      <button class="card day btn-card" data-act="onboard" data-mode="generar"><div class="day-ic">✨</div><div class="grow"><b>Generar una rutina</b>
        <small>Según tu objetivo, días y material</small></div><span class="chev">›</span></button>
      ${PRESETS.map(p => `<button class="card day btn-card" data-act="onboard" data-mode="preset" data-key="${p.key}"><div class="day-ic">${p.days[0].icon}</div>
        <div class="grow"><b>Cargar ${esc(p.name)}</b><small>Rutina predefinida · ${p.days.length} días</small></div><span class="chev">›</span></button>`).join('')}
      <label class="card day btn-card file-btn"><div class="day-ic">📥</div><div class="grow"><b>Importar mi rutina</b>
        <small>Desde un archivo .json (te lo puedes enviar por WhatsApp o email)</small></div><span class="chev">›</span>
        <input type="file" accept="application/json,.json" id="w-import" hidden></label>
      <button class="card day btn-card" data-act="onboard" data-mode="vacia"><div class="day-ic">📝</div><div class="grow"><b>Empezar sin rutina</b>
        <small>La montas tú después</small></div><span class="chev">›</span></button>
      ${first ? '' : '<a class="btn block ghost" href="#/usuarios">Cancelar</a>'}`;
  }
  function viewUsers() {
    const cur = Store.currentUser();
    return '<h2>Personas en este móvil</h2>' + Store.getUsers().list.map(u => {
      const n = (JSON.parse(localStorage.getItem(`gymlog.u.${u.id}`) || '{}').workouts || []).length;
      return `<div class="card day ${u.id === cur.id ? 'next' : ''}"><div class="day-ic">${u.avatar}</div><div class="grow"><b>${esc(u.name)}</b>
        <small>${n} entrenos${u.id === cur.id ? ' · perfil activo' : ''}</small></div>
        ${u.id === cur.id ? `<button class="icon" data-act="rename-user" data-id="${u.id}" title="Cambiar nombre">✏️</button>`
          : `<button class="btn small primary" data-act="switch-user" data-id="${u.id}">Usar</button>
             <button class="icon" data-act="del-user" data-id="${u.id}" title="Borrar">🗑</button>`}</div>`;
    }).join('') + `<a class="btn block primary" href="#/bienvenida">+ Añadir persona</a>
      <p class="muted small">Si cada uno usa su móvil, no hace falta: cada instalación guarda sus propios datos.</p>`;
  }

  // ---------- router ----------
  const routes = [
    [/^#\/bienvenida$/, viewWelcome, '', 'GymLog'],
    [/^#\/usuarios$/, viewUsers, '', 'Personas'],
    [/^#?\/?$/, viewHome, 'home', 'GymLog'],
    [/^#\/generar$/, viewGenerator, 'rutinas', 'Nueva rutina'],
    [/^#\/rutinas$/, viewRoutines, 'rutinas', 'Rutinas'],
    [/^#\/rutina\/(\w+)$/, viewRoutine, 'rutinas', 'Editar rutina'],
    [/^#\/elegir\/(\w+)\/(\d+)(?:\/(\d+))?$/, viewPicker, 'rutinas', 'Elegir ejercicio'],
    [/^#\/entreno$/, viewWorkout, 'entreno', 'Entreno'],
    [/^#\/resumen\/(\w+)$/, viewSummary, 'historial', 'Resumen'],
    [/^#\/ejercicios$/, viewCatalog, 'ejercicios', 'Máquinas'],
    [/^#\/ejercicio\/([\w-]+)$/, viewExercise, 'ejercicios', 'Ejercicio'],
    [/^#\/nuevo-ejercicio$/, viewNewExercise, 'ejercicios', 'Nueva máquina'],
    [/^#\/historial$/, viewHistory, 'historial', 'Historial'],
    [/^#\/pasado$/, viewPast, 'historial', 'Entreno pasado'],
    [/^#\/editar\/(\w+)$/, viewEditWorkout, 'historial', 'Corregir entreno'],
    [/^#\/ajustes$/, viewSettings, '', 'Ajustes'],
    [/^#\/ciclo$/, viewCycle, 'home', 'Mi ciclo'],
    [/^#\/medidas$/, viewMeasures, 'historial', 'Medidas'],
    [/^#\/logros$/, viewMedals, 'home', 'Logros'],
    [/^#\/mes(?:\/(\d{4}-\d{2}))?$/, viewMonth, 'historial', 'Resumen del mes'],
  ];
  function render(keepScroll) {
    // Sin ningún perfil todavía: primero la bienvenida.
    const hash = Store.currentUser() ? (location.hash || '#/') : '#/bienvenida';
    const route = routes.find(([re]) => re.test(hash)) || routes[0];
    const u = Store.currentUser();
    document.getElementById('user-btn').textContent = u ? u.avatar : '';
    document.body.classList.toggle('no-user', !u);
    const m = hash.match(route[0]) || [];
    const y = window.scrollY;
    $app.innerHTML = route[1](...m.slice(1));
    document.getElementById('title').textContent = route[3];
    document.querySelectorAll('.tabbar a').forEach(a => a.classList.toggle('on', a.dataset.tab === route[2]));
    justDone = null;
    syncWakeLock();
    if (keepScroll) { window.scrollTo(0, y); return; }
    window.scrollTo(0, 0);
    // Animación de entrada de la vista.
    $app.classList.remove('enter');
    void $app.offsetWidth;
    $app.classList.add('enter');
    animateCounts();
    // Al terminar un entreno: confeti si ha caído medalla o se ha cumplido la semana.
    if (celebrate && hash === '#/resumen/' + celebrate) {
      if ($app.querySelector('.new-medal, .week-done')) setTimeout(() => confetti(), 700);
      celebrate = null;
    }
  }
  function animateCounts() {
    $app.querySelectorAll('[data-count]').forEach(el => {
      const to = Number(el.dataset.count), t0 = performance.now(), dur = 1400;
      const step = now => {
        const p = Math.min(1, Math.max(0, (now - t0) / dur)), e = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(to * e).toLocaleString('es-ES');
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }
  window.addEventListener('hashchange', () => { swapOpen = null; memoOpen = null; demoOpen = null; render(false); });

  // Pantalla encendida mientras hay un entreno en curso (no en los de días pasados).
  let wakeLock = null, wakeBusy = false;
  async function syncWakeLock() {
    if (!('wakeLock' in navigator) || wakeBusy) return;
    const w = Store.currentUser() && S().activeWorkout;
    const want = !!w && !w.past && S().settings.keepAwake !== false && document.visibilityState === 'visible';
    wakeBusy = true;
    try {
      if (want && !wakeLock) {
        wakeLock = await navigator.wakeLock.request('screen');
        wakeLock.addEventListener('release', () => { wakeLock = null; });
      } else if (!want && wakeLock) { await wakeLock.release(); wakeLock = null; }
    } catch (e) { wakeLock = null; /* sin permiso o batería baja: no pasa nada */ }
    wakeBusy = false;
  }
  // Al volver a la app, Android suelta el bloqueo: se pide otra vez.
  document.addEventListener('visibilitychange', syncWakeLock);

  // ---------- temporizador de descanso ----------
  const Timer = (() => {
    const el = document.getElementById('timer');
    el.innerHTML = `<div class="tbar"></div><span class="tlabel"></span>
      <button data-act="timer-add" data-s="-15">−15</button><button data-act="timer-add" data-s="15">+15</button><button data-act="timer-stop">✕</button>`;
    const bar = el.querySelector('.tbar'), label = el.querySelector('.tlabel');
    const mmss = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    let endAt = 0, total = 0, int = null, fired = false, phase = null, shown = 0;
    // Una fase es un tramo de cuenta atrás: descanso, preparación o aguante (planchas).
    function begin(p) {
      phase = p; total = p.secs; endAt = Date.now() + p.secs * 1000; fired = false; shown = 0;
      el.classList.remove('hidden', 'ready');
      el.classList.toggle('holding', !!p.hold);
      clearInterval(int); int = setInterval(tick, 250); tick();
    }
    function tick() {
      const left = Math.ceil((endAt - Date.now()) / 1000);
      if (left <= 0) {
        if (fired) return;
        fired = true;
        if (phase.onEnd) { clearInterval(int); phase.onEnd(); return; }
        label.textContent = '¡A por la siguiente serie! 💪';
        bar.style.width = '0%';
        el.classList.add('ready');
        navigator.vibrate && navigator.vibrate([300, 150, 300]);
        return;
      }
      if (phase.beeps && left !== shown && left <= 3) beep(760, 0.08);
      shown = left;
      label.textContent = phase.label(left);
      bar.style.width = `${left / total * 100}%`;
    }
    return {
      start(sec) {
        const c = this.onCancel; this.onCancel = null; c && c();
        begin({ secs: sec, label: l => `Descanso ${mmss(l)}` });
      },
      // 5 s para colocarte y luego la cuenta atrás del ejercicio; al acabar llama a onDone.
      hold(secs, name, onDone, onCancel) {
        this.onCancel = onCancel;
        begin({ secs: 5, beeps: true, label: l => `Colócate… ${l}`, onEnd: () => {
          beep(1040, 0.25); navigator.vibrate && navigator.vibrate(250);
          begin({ secs, hold: true, beeps: true, label: l => `${name} · aguanta ${mmss(l)}`, onEnd: () => {
            this.onCancel = null;
            el.classList.remove('holding');
            beep(660, 0.5); navigator.vibrate && navigator.vibrate([400, 150, 400]);
            onDone();
          } });
        } });
      },
      add(sec) { endAt += sec * 1000; total = Math.max(total + sec, 1); fired = false; el.classList.remove('ready'); tick(); },
      stop() {
        clearInterval(int); el.classList.add('hidden'); el.classList.remove('holding');
        const c = this.onCancel; this.onCancel = null; c && c();
      },
    };
  })();
  setInterval(() => {
    const el = document.getElementById('elapsed'), w = S().activeWorkout;
    if (el && w) el.textContent = fmtDur(Date.now() - w.start);
  }, 30000);

  // Marca una serie como hecha y lanza el descanso (o avisa de la superserie).
  function completeSet(ei, si) {
    const e = S().activeWorkout.exercises[ei], s = e.sets[si], mode = Store.exSettings(e.exId).mode;
    if (mode === 'tiempo') { if (!s.secs) s.secs = Number(e.target.secs) || 30; }
    else if (s.reps === '') s.reps = Number(e.suggestion?.reps || e.target.repMin);
    if (s.kg === '' && mode !== 'goma' && mode !== 'tiempo') s.kg = 0;
    s.done = true;
    justDone = `${ei}-${si}`;
    navigator.vibrate && navigator.vibrate(30);
    // ¿Récord? 1RM estimado de esta serie por encima de todo tu historial (y de lo que ya llevas hoy).
    const w = S().activeWorkout;
    if (!['goma', 'tiempo'].includes(mode) && !['descarga', 'hiit'].includes(w.type)) {
      const hist = Progression.historyFor(e.exId), v = Progression.e1rm(Number(s.kg) || 0, Number(s.reps) || 0, s.rir);
      const prevBest = Math.max(e.prBest || 0, ...hist.map(x => Progression.bestE1rm(x.sets)));
      if (hist.length && v > prevBest + 1e-6) {
        e.prBest = v;
        setTimeout(() => confetti(90), 150);
        navigator.vibrate && navigator.vibrate([60, 60, 60, 60, 200]);
        toast(`🏆 ¡Récord en ${Store.exercise(e.exId).name}!`);
      }
    }
    const next = e.superset && S().activeWorkout.exercises[ei + 1];
    if (S().activeWorkout.past) { /* entreno pasado: sin descansos */ }
    else if (next) { Timer.stop(); toast(`🔗 Sin descanso → ${Store.exercise(next.exId).name}`); }
    else Timer.start(Number(e.target.rest) || S().settings.restDefault);
    save(); render(true);
  }

  // ---------- acciones ----------
  const routineOf = el => routineById(el.dataset.rid);
  const actions = {
    start: el => startWorkout(Number(el.dataset.day)),
    'start-past': el => startPast(el),
    'wedit-add-set': el => {
      const sets = S().workouts.find(x => x.id === el.dataset.wid).exercises[el.dataset.ei].sets;
      sets.push(Object.assign({}, sets[sets.length - 1], { done: true })); save(); render(true);
    },
    'wedit-del-set': el => {
      S().workouts.find(x => x.id === el.dataset.wid).exercises[el.dataset.ei].sets.splice(Number(el.dataset.si), 1); save(); render(true);
    },
    'wedit-rm-ex': el => {
      const w = S().workouts.find(x => x.id === el.dataset.wid);
      if (w.exercises.length < 2) return toast('Si no queda ninguno, mejor borra el entreno desde el resumen.');
      if (!confirm(`¿Quitar ${Store.exercise(w.exercises[el.dataset.ei].exId).name} de este entreno?`)) return;
      w.exercises.splice(Number(el.dataset.ei), 1); save(); render(true);
    },
    quick: el => startQuick(el.dataset.type),
    generate: () => {
      const brands = [...document.querySelectorAll('.g-brand:checked')].map(i => i.value);
      if (!brands.length) return toast('Elige al menos un tipo de material.');
      const profile = Object.assign({}, S().profile, { goal: document.getElementById('g-goal').value, days: Number(document.getElementById('g-days').value),
        level: document.getElementById('g-level').value, brands });
      S().profile = profile;
      const r = Generator.generate(profile);
      S().activeRoutineId = r.id;
      S().routines.push(r);
      save();
      go('#/rutina/' + r.id);
    },
    'new-routine': () => {
      const r = { id: Store.uid(), name: 'Mi rutina', goal: S().profile?.goal || 'recomposicion', createdAt: Date.now(), days: [{ name: 'Día 1', icon: '🏋️', exercises: [] }] };
      S().routines.push(r);
      if (!S().activeRoutineId) S().activeRoutineId = r.id;
      save(); go('#/rutina/' + r.id);
    },
    activate: el => { S().activeRoutineId = el.dataset.id; save(); toast('Rutina activada'); render(true); },
    'add-preset': el => { const r = Store.addPreset(PRESETS.find(p => p.key === el.dataset.key)); go('#/rutina/' + r.id); },
    'share-routine': el => {
      const r = routineById(el.dataset.id);
      downloadJSON(Store.exportRoutinePack(r), `rutina-${r.name.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}.json`);
      toast('Archivo descargado: compártelo por WhatsApp o email');
    },
    'dup-routine': el => {
      const r = JSON.parse(JSON.stringify(routineById(el.dataset.id)));
      r.id = Store.uid(); r.name += ' (copia)'; delete r.presetKey;
      S().routines.push(r); save(); render(true);
    },
    'del-routine': el => {
      if (!confirm('¿Borrar esta rutina? Tu historial de entrenos se mantiene.')) return;
      S().routines = S().routines.filter(r => r.id !== el.dataset.id);
      if (S().activeRoutineId === el.dataset.id) S().activeRoutineId = S().routines[0]?.id || null;
      save(); render(true);
    },
    'set-icon': el => { routineOf(el).days[el.dataset.di].icon = el.dataset.icon; save(); render(true); },
    'add-day': el => { const r = routineOf(el); r.days.push({ name: `Día ${r.days.length + 1}`, icon: '🏋️', exercises: [] }); save(); render(true); },
    'del-day': el => {
      const r = routineOf(el);
      if (!confirm(`¿Borrar "${r.days[el.dataset.di].name}"?`)) return;
      r.days.splice(Number(el.dataset.di), 1); save(); render(true);
    },
    mv: el => {
      const list = routineOf(el).days[el.dataset.di].exercises, i = Number(el.dataset.xi), j = i + Number(el.dataset.dir);
      if (j < 0 || j >= list.length) return;
      [list[i], list[j]] = [list[j], list[i]]; save(); render(true);
    },
    'del-rx': el => { routineOf(el).days[el.dataset.di].exercises.splice(Number(el.dataset.xi), 1); save(); render(true); },
    pick: el => {
      const { rid, di, xi } = pickerCtx, ex = Store.exercise(el.dataset.id);
      if (rid === 'workout') {
        const w = S().activeWorkout;
        if (!w) return go('#/entreno');
        if (xi !== null) { if (swapWorkoutEx(xi, ex.id)) go('#/entreno'); return; }
        w.exercises.push(newWorkoutEx(ex.id, Generator.targetFor(ex, S().profile?.goal, S().profile?.level)));
        save(); return go('#/entreno');
      }
      const r = routineById(rid);
      if (xi !== null) r.days[di].exercises[xi].exId = ex.id;
      else r.days[di].exercises.push(Object.assign({ exId: ex.id }, Generator.targetFor(ex, r.goal, S().profile?.level)));
      save(); go('#/rutina/' + rid);
    },
    'open-ex': el => go('#/ejercicio/' + el.dataset.id),
    'f-brand': el => { ui.brand = el.dataset.v; render(true); },
    'pg-group': el => { ui.pg = el.dataset.v; render(true); },
    'pg-metric': el => { ui.pm = el.dataset.v; render(true); },
    'save-custom': () => {
      const name = document.getElementById('n-name').value.trim();
      if (!name) return toast('Ponle un nombre.');
      const ex = { id: 'c-' + Store.uid(), custom: true, name, brand: document.getElementById('n-brand').value.trim() || 'Mi gimnasio', line: '',
        pattern: document.getElementById('n-pattern').value, load: document.getElementById('n-load').value,
        primary: [document.getElementById('n-muscle').value], secondary: [],
        compound: document.getElementById('n-compound').checked, unilateral: document.getElementById('n-uni').checked };
      S().customExercises.push(ex); save(); go('#/ejercicio/' + ex.id);
    },
    'del-custom': el => {
      if (!confirm('¿Borrar esta máquina?')) return;
      S().customExercises = S().customExercises.filter(e => e.id !== el.dataset.id); save(); go('#/ejercicios');
    },
    'del-photo': el => { delete S().photos[el.dataset.id]; save(); render(true); },
    'toggle-set': el => {
      const e = S().activeWorkout.exercises[el.dataset.ei], s = e.sets[el.dataset.si];
      if (!s.done) completeSet(Number(el.dataset.ei), Number(el.dataset.si));
      else { s.done = false; save(); render(true); }
    },
    hold: el => {
      const ei = Number(el.dataset.ei), si = Number(el.dataset.si), key = `${ei}-${si}`;
      if (holdOn === key) return Timer.stop();
      const e = S().activeWorkout.exercises[ei], s = e.sets[si];
      holdOn = key; render(true);
      Timer.hold(Number(s.secs) || 30, Store.exercise(e.exId).name,
        () => { holdOn = null; if (S().activeWorkout?.exercises[ei] === e) completeSet(ei, si); },
        () => { holdOn = null; render(true); });
    },
    'add-set': el => {
      const sets = S().activeWorkout.exercises[el.dataset.ei].sets, last = sets[sets.length - 1];
      const s = { kg: last ? last.kg : '', reps: '', rir: '', done: false };
      if (last?.band !== undefined) s.band = last.band;
      if (last?.secs !== undefined) s.secs = last.secs;
      sets.push(s); save(); render(true);
    },
    'del-set': el => { const sets = S().activeWorkout.exercises[el.dataset.ei].sets; if (sets.length > 1) sets.pop(); save(); render(true); },
    'swap-open': el => { const i = Number(el.dataset.ei); swapOpen = swapOpen === i ? null : i; memoOpen = null; render(true); },
    'memo-open': el => { const i = Number(el.dataset.ei); memoOpen = memoOpen === i ? null : i; swapOpen = null; render(true); },
    'demo-open': el => { const i = Number(el.dataset.ei); demoOpen = demoOpen === i ? null : i; render(true); },
    pain: el => {
      const e = S().activeWorkout.exercises[el.dataset.ei], p = el.dataset.p, on = e.pain || [];
      e.pain = on.includes(p) ? on.filter(x => x !== p) : on.concat(p);
      save(); el.classList.toggle('on', e.pain.includes(p));
    },
    wu: el => {
      const e = S().activeWorkout.exercises[el.dataset.ei], s = e.warmup[el.dataset.wi];
      if (!s.done) { s.kg = warmupKg(e, s); navigator.vibrate && navigator.vibrate(30); }
      s.done = !s.done; save(); render(true);
    },
    'swap-to': el => { if (swapWorkoutEx(Number(el.dataset.ei), el.dataset.id)) render(true); },
    'rm-wex': el => {
      swapOpen = null;
      if (!confirm('¿Quitar este ejercicio del entreno de hoy?')) return;
      S().activeWorkout.exercises.splice(Number(el.dataset.ei), 1); save(); render(true);
    },
    'add-core': () => {
      const w = S().activeWorkout, n = S().workouts.length;
      const picks = CORE.map(g => g.filter(id => !excluded().includes(id) && !w.exercises.some(e => e.exId === id))).filter(g => g.length).map(g => g[n % g.length]);
      picks.forEach(id => w.exercises.push(newWorkoutEx(id, { sets: 2, repMin: 10, repMax: 15, rir: 2, rest: 45, secs: 30 })));
      w.coreAsked = true; save(); render(true); toast('Core añadido al final 🎯');
    },
    'skip-core': () => { S().activeWorkout.coreAsked = true; save(); render(true); },
    'hiit-toggle': () => {
      if (Hiit.running) {
        Hiit.running = false; Hiit.left = Math.max(0, (Hiit.endAt - Date.now()) / 1000); clearInterval(Hiit.int);
      } else {
        if (Hiit.idx < 0) { Hiit.idx = 0; Hiit.left = hiitPlan(S().activeWorkout)[0].secs; beep(880, 0.15); }
        Hiit.endAt = Date.now() + Hiit.left * 1000; Hiit.running = true;
        clearInterval(Hiit.int); Hiit.int = setInterval(hiitTick, 200);
      }
      render(true);
    },
    'hiit-skip': () => { Hiit.endAt = Date.now(); Hiit.left = 0; hiitAdvance(); },
    finish: () => {
      const w = S().activeWorkout;
      if (!w.exercises.some(e => e.sets.some(s => s.done))) {
        document.getElementById('msg').innerHTML = '<div class="card warn">Marca con ✓ al menos una serie antes de terminar.</div>';
        return;
      }
      w.exercises.forEach(e => {
        e.sets = e.sets.filter(s => s.done); delete e.suggestion; delete e.prBest;
        if (e.warmup) e.warmup = e.warmup.filter(s => s.done);
        if (!e.warmup?.length) delete e.warmup;
        if (!e.pain?.length) delete e.pain;
        if (!e.memo) delete e.memo;
      });
      w.exercises = w.exercises.filter(e => e.sets.length);
      w.end = w.past ? w.start + w.past * 60000 : Date.now();
      delete w.past;
      S().workouts.push(w); S().activeWorkout = null;
      Object.assign(Hiit, { idx: -1, running: false }); clearInterval(Hiit.int);
      celebrate = w.id;
      save(); Timer.stop(); go('#/resumen/' + w.id);
    },
    discard: () => {
      if (!confirm('¿Descartar el entreno en curso?')) return;
      S().activeWorkout = null; Object.assign(Hiit, { idx: -1, running: false }); clearInterval(Hiit.int);
      save(); Timer.stop(); go('#/');
    },
    'del-workout': el => {
      if (!confirm('¿Borrar este entreno del historial?')) return;
      S().workouts = S().workouts.filter(w => w.id !== el.dataset.id); save(); go('#/historial');
    },
    'rate-energy': el => {
      const w = S().workouts.find(x => x.id === el.dataset.id), v = Number(el.dataset.v);
      w.energy = w.energy === v ? undefined : v; save();
      // Sin re-render: así no se reinicia el contador animado de kilos.
      el.parentNode.querySelectorAll('button').forEach(b => b.classList.toggle('on', Number(b.dataset.v) === w.energy));
      document.getElementById('sum-text').value = summaryText(w);
      if (w.energy) toast(`${Cycle.ENERGY[v].icon} Anotado. ¡Gracias!`);
    },
    'cycle-start': el => {
      const date = el.dataset.when === 'today' ? Cycle.ymd() : document.getElementById('cy-date')?.value;
      if (!date || date > Cycle.ymd()) return toast('Elige una fecha que no sea futura.');
      if (Cycle.addStart(date)) { toast(`🩸 Anotado: ${Cycle.fmt(date)}`); render(true); }
    },
    'cycle-del': el => { if (confirm(`¿Borrar la regla del ${Cycle.fmt(el.dataset.d)}?`)) { Cycle.removeStart(el.dataset.d); render(true); } },
    'cycle-clear': () => {
      if (!confirm('¿Borrar todas las fechas y opciones del ciclo? Tus entrenos y valoraciones se mantienen.')) return;
      Cycle.reset(); toast('Datos del ciclo borrados'); render(true);
    },
    'copy-summary': () => {
      const ta = document.getElementById('sum-text');
      const fallback = () => { ta.select(); try { document.execCommand('copy'); toast('📋 Resumen copiado'); } catch (e) { toast('Mantén pulsado el texto para copiarlo'); } };
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => toast('📋 Resumen copiado'), fallback);
      else fallback();
    },
    'share-summary': () => navigator.share({ text: document.getElementById('sum-text').value }).catch(() => {}),
    'timer-add': el => Timer.add(Number(el.dataset.s)),
    'timer-stop': () => Timer.stop(),
    export: () => { exportBackup(); render(true); },
    'backup-later': () => { S().settings.backupNag = Date.now(); save(); render(true); },
    'news-ok': () => {
      S().settings.seenNews = NEWS[0].v; save();
      const bg = document.querySelector('.sheet-bg'); bg.classList.remove('show'); setTimeout(() => bg.remove(), 250);
    },
    'save-measure': () => {
      const d = document.getElementById('m-date').value, entry = {};
      if (!d || d > ymd(Date.now())) return toast('Elige una fecha que no sea futura.');
      Object.keys(METRICS).forEach(k => { const v = document.getElementById('m-' + k).value; if (v !== '' && Number(v) > 0) entry[k] = Number(v); });
      if (!Object.keys(entry).length) return toast('Rellena al menos una medida.');
      const list = S().measures = S().measures || [], same = list.find(m => m.d === d);
      if (same) Object.assign(same, entry); else list.push(Object.assign({ d }, entry));
      // El peso más reciente alimenta el cálculo de calorías y proteína.
      const lw = series('weight').pop();
      if (lw) S().settings.bodyweight = lw.v;
      save(); toast('📏 Medidas guardadas'); render(true);
    },
    'del-measure': el => {
      if (!confirm(`¿Borrar las medidas del ${Cycle.fmt(el.dataset.d)}?`)) return;
      S().measures = S().measures.filter(m => m.d !== el.dataset.d); save(); render(true);
    },
    reset: () => { if (confirm('¿Seguro? Se borrarán rutinas, historial y fotos de este perfil.')) { Store.reset(); go('#/'); render(); } },
    'update-preset': el => {
      if (!confirm('Se sustituirán los ejercicios, pesos de referencia y notas de esta rutina por la versión nueva. ¿Continuar?')) return;
      Store.updatePreset(el.dataset.id); toast('Rutina actualizada ✅'); render(true);
    },
    'toggle-excl': el => { Store.toggleExcluded(el.dataset.id); render(true); },
    'pick-avatar': el => { newAvatar = el.dataset.a; document.querySelectorAll('.avatars button').forEach(b => b.classList.toggle('on', b === el)); },
    onboard: el => {
      const name = createUserFromWelcome();
      if (!name) return;
      if (el.dataset.mode === 'preset') { Store.addPreset(PRESETS.find(p => p.key === el.dataset.key)); toast(`¡Hola, ${name}! Rutina cargada`); go('#/'); }
      else if (el.dataset.mode === 'generar') go('#/generar');
      else go('#/rutinas');
      render();
    },
    'switch-user': el => { Store.switchUser(el.dataset.id); Timer.stop(); Store.migrate(); toast(`Perfil: ${Store.currentUser().name}`); go('#/'); render(); checkNews(); },
    'rename-user': el => {
      const name = prompt('Nuevo nombre', Store.currentUser().name);
      if (name && name.trim()) { Store.updateUser(el.dataset.id, { name: name.trim() }); render(true); }
    },
    'del-user': el => {
      const u = Store.getUsers().list.find(x => x.id === el.dataset.id);
      if (!confirm(`¿Borrar el perfil de ${u.name} con todo su historial? No se puede deshacer.`)) return;
      Store.deleteUser(u.id); render(true);
    },
  };

  document.addEventListener('pointerdown', chartPoint);
  document.addEventListener('pointermove', ev => { if (ev.target.closest('.chart.show')) chartPoint(ev); });

  document.addEventListener('click', ev => {
    const el = ev.target.closest('[data-act]');
    if (el && actions[el.dataset.act]) { ev.preventDefault(); actions[el.dataset.act](el, ev); }
  });

  document.addEventListener('input', ev => {
    const t = ev.target;
    if (t.id === 'q') { ui.q = t.value; document.getElementById('list').innerHTML = listHTML(pickerCtx ? 'pick' : 'open-ex'); }
  });

  document.addEventListener('change', ev => {
    const t = ev.target, d = t.dataset;
    const val = d.f === 'band' || d.wf === 'band' || d.xf === 'band' || d.xf === 'note' ? t.value : t.value === '' ? '' : Number(t.value);
    if (d.wf) { // serie de un entreno ya guardado
      S().workouts.find(x => x.id === d.wid).exercises[d.ei].sets[d.si][d.wf] = val; save();
    } else if (d.wd) { // fecha, hora o duración de un entreno guardado
      const w = S().workouts.find(x => x.id === d.wid), mins = Math.round((w.end - w.start) / 60000);
      if (d.wd === 'mins') { if (val > 0) w.end = w.start + val * 60000; }
      else {
        const date = d.wd === 'date' ? t.value : ymd(w.start), time = d.wd === 'time' ? t.value : hhmm(w.start);
        const start = new Date(`${date}T${time}`).getTime();
        if (!date || !time || !(start <= Date.now())) { toast('Esa fecha no vale.'); return render(true); }
        w.start = start; w.end = start + mins * 60000;
      }
      save();
    } else if (d.f) { // serie del entreno en curso
      const sets = S().activeWorkout.exercises[d.ei].sets, si = Number(d.si), old = sets[si][d.f];
      sets[si][d.f] = val;
      // Si cambias el peso, la goma o el tiempo, se propaga a las series siguientes que tenían lo mismo y no están hechas.
      if (['kg', 'band', 'secs'].includes(d.f)) sets.forEach((s, i) => {
        if (i > si && !s.done && s[d.f] === old) {
          s[d.f] = val;
          const inp = document.querySelector(`[data-f="${d.f}"][data-ei="${d.ei}"][data-si="${i}"]`);
          if (inp) inp.value = val;
        }
      });
      save();
      // Los pesos de aproximación siguen al peso de trabajo.
      const e = S().activeWorkout.exercises[d.ei], label = Store.exSettings(e.exId).label;
      if (d.f === 'kg' && e.warmup) e.warmup.forEach((s, wi) => {
        const b = document.querySelector(`[data-act="wu"][data-ei="${d.ei}"][data-wi="${wi}"]`), kg = warmupKg(e, s);
        if (b) b.textContent = `${kg ? `${fmtNum(kg)} ${label}` : `${s.pct} %`} × ${s.reps}`;
      });
    } else if (d.memo) {
      S().activeWorkout.exercises[d.memo].memo = t.value.trim(); save();
    } else if ('exsWu' in d) { Store.setExSettings(d.id, { warmup: t.checked }); }
    else if (t.id === 's-awake') { S().settings.keepAwake = t.checked; save(); syncWakeLock(); }
    else if (d.ms) { /* campos del formulario de medidas: se guardan con el botón */ }
    else if ('xs' in d) { routineOf(t).days[d.di].exercises[d.xi].superset = t.checked; save(); }
    else if (d.xf) { routineOf(t).days[d.di].exercises[d.xi][d.xf] = val; save(); }
    else if (d.df) { routineOf(t).days[d.di][d.df] = t.value; save(); }
    else if (d.rf) { routineOf(t)[d.rf] = t.value; save(); }
    else if (d.exs) { Store.setExSettings(d.id, { [d.exs]: d.exs === 'mode' ? t.value : val }); render(true); }
    else if (d.kcal) {
      const w = S().workouts.find(x => x.id === d.kcal);
      w.kcal = val; save();
      document.getElementById('nutri').innerHTML = nutritionHTML(w);
      document.getElementById('sum-text').value = summaryText(w);
    }
    else if (d.photo && t.files[0]) savePhoto(d.photo, t.files[0]);
    else if (t.id === 'f-muscle') { ui.muscle = t.value; document.getElementById('list').innerHTML = listHTML(pickerCtx ? 'pick' : 'open-ex'); }
    else if (t.id === 'f-load') { ui.load = t.value; document.getElementById('list').innerHTML = listHTML(pickerCtx ? 'pick' : 'open-ex'); }
    else if (t.id === 'f-same') { ui.samePattern = t.checked; document.getElementById('list').innerHTML = listHTML('pick'); }
    else if (t.classList.contains('s-brand')) {
      const brands = [...document.querySelectorAll('.s-brand:checked')].map(i => i.value);
      if (!brands.length) { t.checked = true; return toast('Deja al menos un tipo de material.'); }
      S().profile = Object.assign({ goal: 'recomposicion', days: 4, level: 'intermedio' }, S().profile, { brands }); save();
    }
    else if (t.id === 's-rest') { S().settings.restDefault = Number(t.value) || 120; save(); }
    else if (d.body) {
      if (BODY_SETTINGS.includes(d.body)) S().settings[d.body] = d.body === 'sex' ? t.value : val;
      else { S().profile = Object.assign({ brands: Generator.BRANDS.slice() }, S().profile, { [d.body]: d.body === 'days' ? Number(t.value) : t.value }); }
      save();
      if (d.body === 'sex') return render(true); // muestra u oculta el seguimiento del ciclo
      document.getElementById('energy').innerHTML = energyHTML();
    }
    else if (d.cy) { S().cycle[d.cy] = t.checked; save(); render(true); }
    else if (t.id === 'import-routine' && t.files[0]) importRoutineFile(t.files[0], res => res && go('#/rutina/' + res.routine.id));
    else if (t.id === 'w-import' && t.files[0]) {
      const file = t.files[0];
      t.value = '';
      if (!createUserFromWelcome()) return;
      importRoutineFile(file, res => { go(res ? '#/' : '#/rutinas'); render(); });
    }
    else if (t.id === 'import' && t.files[0]) {
      t.files[0].text().then(txt => { try { Store.importJSON(txt); toast('Datos importados'); go('#/'); render(); } catch (e) { toast('No se pudo importar: ' + e.message); } });
    }
  });

  // Recorta la foto a cuadrado centrado de 480 px: queda uniforme con los pictogramas.
  function savePhoto(exId, file) {
    const img = new Image();
    img.onload = () => {
      const side = Math.min(img.width, img.height), out = Math.min(480, side);
      const c = document.createElement('canvas');
      c.width = c.height = out;
      c.getContext('2d').drawImage(img, (img.width - side) / 2, (img.height - side) / 2, side, side, 0, 0, out, out);
      S().photos[exId] = c.toDataURL('image/jpeg', 0.75);
      URL.revokeObjectURL(img.src);
      if (!save()) delete S().photos[exId];
      render(true);
    };
    img.src = URL.createObjectURL(file);
  }

  if (Store.currentUser()) Store.migrate();
  render();
  if (Store.currentUser()) checkNews();

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js');
  }
})();
