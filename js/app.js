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
  const ui = { q: '', brand: 'all', muscle: 'all', samePattern: true };
  let justDone = null; // serie recién marcada, para animarla
  let swapOpen = null; // ejercicio del entreno con el panel de alternativas abierto
  let holdOn = null;   // serie por tiempo con la cuenta atrás en marcha ("ei-si")

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
  const CORE = ['g-dead-bug', 'g-pallof', 'g-high-plank', 'g-cable-crunch', 'g-bird-dog', 'hss-ab-crunch'];

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
  const workoutRegion = w => ['hiit', 'potencia'].includes(w.type) ? null : regionOf(w.exercises.map(e => [e.exId, e.sets.length]));
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
    return {
      exId, target, suggestion: sug, note: ref.note || '', superset: !!ref.superset,
      sets: Array.from({ length: Number(target.sets) || 3 }, () => ({ kg: sug.kg ?? '', reps: '', rir: '', done: false })),
    };
  }
  function confirmReplace() {
    return !S().activeWorkout || confirm('Ya tienes un entreno en curso. ¿Descartarlo y empezar otro?');
  }
  function startWorkout(dayIdx) {
    const r = activeRoutine();
    if (!r || !confirmReplace()) return;
    const d = r.days[dayIdx];
    S().activeWorkout = {
      id: Store.uid(), type: 'rutina', routineId: r.id, dayIndex: dayIdx, dayName: d.name, icon: d.icon, start: Date.now(),
      exercises: d.exercises.map(x => newWorkoutEx(x.exId, { sets: x.sets, repMin: x.repMin, repMax: x.repMax, rir: x.rir, rest: x.rest, secs: x.secs }, x)),
    };
    save();
    go('#/entreno');
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
    let h = `<p class="hello">Hola, <b>${esc(u.name)}</b> ${u.avatar}</p>`;
    if (s.activeWorkout) {
      h += `<a class="card live" href="#/entreno"><span class="pulse"></span><div class="grow"><b>Entreno en curso</b>
        <small>${esc(s.activeWorkout.dayName)} · hace ${fmtDur(Date.now() - s.activeWorkout.start)}</small></div><span class="chev">›</span></a>`;
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

  function volumeCard(r) {
    const v = Generator.weeklyVolume(r);
    const rows = Object.entries(v).sort((a, b) => b[1] - a[1]);
    if (!rows.length) return '';
    const max = Math.max(22, ...rows.map(x => x[1]));
    return `<div class="card"><h3>Series semanales por músculo</h3>
      <p class="muted small">Referencia para hipertrofia/recomposición: ~10–20 series por músculo y semana (franja verde).</p>
      ${rows.map(([m, n]) => `<div class="vol"><span>${m}</span><div class="vol-track"><div class="vol-band" style="left:${10 / max * 100}%;width:${10 / max * 100}%"></div>
        <div class="vol-bar ${n < 10 ? 'low' : n > 20 ? 'high' : 'ok'}" style="width:${n / max * 100}%"></div></div><b>${+n.toFixed(1)}</b></div>`).join('')}
      </div>`;
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
      <select id="f-muscle"><option value="all">Todos los músculos</option>${MUSCLES.map(m => `<option ${ui.muscle === m ? 'selected' : ''}>${m}</option>`).join('')}</select>
      ${withPattern ? `<label class="check-row"><input type="checkbox" id="f-same" ${ui.samePattern ? 'checked' : ''}> Solo alternativas del mismo patrón</label>` : ''}</div>`;
  }

  function filtered() {
    const q = ui.q.trim().toLowerCase();
    return Store.allExercises().filter(e =>
      (!pickerCtx || !excluded().includes(e.id)) &&
      (ui.brand === 'all' || e.brand === ui.brand || (ui.brand === 'Mis máquinas' && e.custom)) &&
      (ui.muscle === 'all' || e.primary.includes(ui.muscle) || e.secondary.includes(ui.muscle)) &&
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
      <div class="card"><h3>Carga</h3><div class="rx-fields two">
        <label>Cómo anoto el peso<select data-exs="mode" data-id="${id}">${Object.entries(Store.MODES).map(([k, v]) => `<option value="${k}" ${st.mode === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
        ${st.mode === 'goma' || st.mode === 'tiempo' ? '' : `<label>Subida mínima (${st.label})<input type="number" step="0.25" inputmode="decimal" data-exs="increment" data-id="${id}" value="${st.increment}"></label>`}</div>
        <p class="muted small">${st.mode === 'goma' ? `Anotas el color de la goma. Orden de suave a dura: ${Object.values(BANDS).map(b => b.dot + ' ' + b.label.toLowerCase()).join(' → ')} (puede variar según la marca).`
          : st.mode === 'tiempo' ? 'Eliges los segundos de cada serie y la app hace la cuenta atrás.'
          : 'Ajusta la subida al salto real de la máquina (p. ej. 1,25 si tienes discos pequeños, o el salto entre placas).'}</p></div>
      <div class="sug ${sg.type}">${sugIcon(sg.type)} ${esc(sg.msg)}</div>`;
    const alts = Generator.alternatives(id);
    if (alts.length) h += `<div class="card"><h3>Alternativas</h3><p class="muted small">Trabajan lo mismo, por si la máquina está ocupada.</p>
      ${alts.map(e => `<a class="list-item" href="#/ejercicio/${e.id}">${thumb(e.id, 'sm')}<div class="grow"><b>${esc(e.name)}</b>
        <small>${esc(e.brand)}${e.line ? ' · ' + esc(e.line) : ''} · ${esc(e.primary.join(', '))}</small></div></a>`).join('')}</div>`;
    h += `<div class="card"><h3>Historial</h3>${best ? `<p>Mejor 1RM estimado: <b>${best.toFixed(1)} ${st.label}</b></p>` : ''}
      ${hist.length ? hist.map(x => `<div class="hist-row"><span>${fmtDate(x.date)}</span><span>${x.sets.map(s => esc(Progression.fmtSet(id, s))).join(' · ')}</span></div>`).join('') : '<p class="muted">Sin registros todavía.</p>'}</div>`;
    return h;
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
    let h = `<div class="workout-head"><div class="day-ic">${workoutIcon(w)}</div><div class="grow"><h2>${esc(w.dayName)}</h2><small>⏱ <span id="elapsed">${fmtDur(Date.now() - w.start)}</span></small></div>
      <button class="btn primary" data-act="finish">Terminar</button></div><div id="msg"></div>`;
    const notes = routineById(w.routineId)?.notes;
    if (notes) h += `<details class="card notes"><summary>📝 Notas de la rutina</summary><p>${esc(notes).replace(/\n/g, '<br>')}</p></details>`;
    w.exercises.forEach((e, ei) => { h += exerciseCard(e, ei); });
    const hasCore = w.exercises.some(e => Store.exercise(e.exId).pattern === 'core');
    if (!hasCore && !w.coreAsked && ['rutina', 'fullbody', 'pierna', 'torso'].includes(w.type || 'rutina')) {
      h += `<div class="card core-offer"><div class="pict g-core sm">${Icons.svg('core')}</div><div class="grow"><b>¿Cierras con core?</b>
        <small>3 ejercicios · ~6 min · sin apoyar codos</small></div>
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
    return `<section class="card ex ${allDone ? 'complete' : ''} ${nextEx ? 'ss-top' : ''} ${prevSS ? 'ss-bottom' : ''}">${ssBadge}
      <div class="rx-head">${thumb(e.exId)}<div class="grow"><a href="#/ejercicio/${e.exId}"><h3>${esc(ex.name)}</h3></a><small>${esc(ex.brand)}${ex.line ? ' · ' + esc(ex.line) : ''}</small></div>
        <button class="swap-btn ${swapOpen === ei ? 'on' : ''}" data-act="swap-open" data-ei="${ei}" title="Cambiar de máquina">⇄</button>
        <button class="icon" data-act="rm-wex" data-ei="${ei}" title="Quitar">✕</button></div>
      ${swapOpen === ei ? swapPanel(e, ei) : ''}
      ${e.swappedFrom ? `<div class="swapped">⇄ Hoy en lugar de ${esc(Store.exercise(e.swappedFrom).name)}</div>` : ''}
      <div class="target">${st.mode === 'tiempo' ? `<span>${t.sets} × ${fmtRest(Number(t.secs) || 30)}</span>`
        : `<span>${t.sets} × ${t.repMin}–${t.repMax}</span><span>RIR ${t.rir}</span>`}<span>⏱ ${fmtRest(t.rest)}</span></div>
      ${e.note ? `<div class="note">📝 ${esc(e.note)}</div>` : ''}
      <div class="sug ${sg.type}">${sugIcon(sg.type)} ${esc(sg.msg)}</div>
      <div class="prev">Anterior: ${esc(prevTxt)}</div>
      <table class="sets ${st.mode === 'tiempo' ? 'hold' : st.mode === 'goma' ? 'band' : ''}">${setRows(e, ei, st.mode)}</table>
      <div class="row gap"><button class="btn small ghost" data-act="add-set" data-ei="${ei}">+ Serie</button>
      <button class="btn small ghost" data-act="del-set" data-ei="${ei}">− Serie</button></div></section>`;
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
      <p class="muted">${fmtDate(w.start)} · ${fmtDur(w.end - w.start)}</p>`;
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
    h += `<div class="stats inner"><div><b>${doneSets(w)}</b><small>series</small></div><div><b>${w.exercises.length}</b><small>ejercicios</small></div><div><b>${fmtDur(w.end - w.start)}</b><small>duración</small></div></div></div>`;

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
        L.push(`   Series: ${e.sets.map(s => Progression.fmtSet(e.exId, s)).join(' | ')}`);
        if (w.type !== 'descarga' && Progression.historyFor(e.exId)[0]?.workoutId === w.id) L.push(`   Próxima vez: ${Progression.suggest(e.exId, t).msg}`);
      }
      if (e.note) L.push(`   Nota: ${e.note}`);
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
    if (!ws.length) return '<p class="muted">Todavía no has registrado entrenos.</p>';
    return '<h2>Historial</h2>' + ws.map(w => {
      const kg = Nutrition.lifted(w);
      return `<a class="list-item" href="#/resumen/${w.id}"><div class="day-ic sm">${workoutIcon(w)}</div><div class="grow"><b>${esc(w.dayName)}</b>
        <small>${fmtDate(w.start)} · ${fmtDur(w.end - w.start)} · ${doneSets(w)} series${kg ? ` · ${fmtNum(Math.round(kg))} kg` : ''}${w.kcal ? ` · ${w.kcal} kcal` : ''}</small></div><span class="chev">›</span></a>`;
    }).join('');
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
      <div class="card"><h2>Ajustes</h2>
      <label>Descanso por defecto (s)<input type="number" id="s-rest" value="${S().settings.restDefault}"></label></div>
      <div class="card"><h3>Material de mi gimnasio</h3><p class="muted small">Marcas que salen en las alternativas, el generador y los entrenos rápidos.</p>
        ${Generator.BRANDS.map(b => `<label class="check-row"><input type="checkbox" class="s-brand" value="${b}" ${(S().profile?.brands || Generator.BRANDS).includes(b) ? 'checked' : ''}> ${b === 'Genérico' ? 'Peso libre, poleas, gomas y multipower' : b}</label>`).join('')}</div>
      <div class="card"><h3>Ejercicios a evitar</h3><p class="muted small">No saldrán en rutinas generadas ni entrenos rápidos. Puedes añadir más desde la ficha de cada ejercicio.</p>
        ${excluded().length ? excluded().map(id => `<div class="hist-row"><span>${esc(Store.exercise(id).name)}</span>
          <button class="btn small ghost" data-act="toggle-excl" data-id="${id}">Permitir</button></div>`).join('') : '<p class="muted">Ninguno.</p>'}</div>
      <div class="card"><h3>Copia de seguridad</h3><p class="muted small">Los datos de este perfil solo están en este móvil. Exporta de vez en cuando.</p>
      <div class="row gap"><button class="btn" data-act="export">Exportar</button>
      <label class="btn file-btn">Importar<input type="file" accept="application/json,.json" id="import" hidden></label></div></div>
      <div class="card"><button class="btn ghost danger" data-act="reset">Borrar los datos de ${esc(u.name)}</button></div>
      <p class="muted small">Hammer Strength y Matrix son marcas de sus respectivos propietarios; esta app no está afiliada a ellas. Pictogramas propios.</p>`;
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
    [/^#\/ajustes$/, viewSettings, '', 'Ajustes'],
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
    if (keepScroll) { window.scrollTo(0, y); return; }
    window.scrollTo(0, 0);
    // Animación de entrada de la vista.
    $app.classList.remove('enter');
    void $app.offsetWidth;
    $app.classList.add('enter');
    animateCounts();
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
  window.addEventListener('hashchange', () => { swapOpen = null; render(false); });

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
    const next = e.superset && S().activeWorkout.exercises[ei + 1];
    if (next) { Timer.stop(); toast(`🔗 Sin descanso → ${Store.exercise(next.exId).name}`); }
    else Timer.start(Number(e.target.rest) || S().settings.restDefault);
    save(); render(true);
  }

  // ---------- acciones ----------
  const routineOf = el => routineById(el.dataset.rid);
  const actions = {
    start: el => startWorkout(Number(el.dataset.day)),
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
    'swap-open': el => { const i = Number(el.dataset.ei); swapOpen = swapOpen === i ? null : i; render(true); },
    'swap-to': el => { if (swapWorkoutEx(Number(el.dataset.ei), el.dataset.id)) render(true); },
    'rm-wex': el => {
      swapOpen = null;
      if (!confirm('¿Quitar este ejercicio del entreno de hoy?')) return;
      S().activeWorkout.exercises.splice(Number(el.dataset.ei), 1); save(); render(true);
    },
    'add-core': () => {
      const w = S().activeWorkout, n = S().workouts.length;
      const pool = CORE.filter(id => !excluded().includes(id) && Store.allExercises().some(e => e.id === id));
      const picks = [0, 1, 2].map(i => pool[(n + i) % pool.length]);
      picks.forEach(id => w.exercises.push(newWorkoutEx(id, { sets: 2, repMin: 10, repMax: 15, rir: 2, rest: 45 })));
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
      w.exercises.forEach(e => { e.sets = e.sets.filter(s => s.done); delete e.suggestion; });
      w.exercises = w.exercises.filter(e => e.sets.length);
      w.end = Date.now();
      S().workouts.push(w); S().activeWorkout = null;
      Object.assign(Hiit, { idx: -1, running: false }); clearInterval(Hiit.int);
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
    'copy-summary': () => {
      const ta = document.getElementById('sum-text');
      const fallback = () => { ta.select(); try { document.execCommand('copy'); toast('📋 Resumen copiado'); } catch (e) { toast('Mantén pulsado el texto para copiarlo'); } };
      if (navigator.clipboard) navigator.clipboard.writeText(ta.value).then(() => toast('📋 Resumen copiado'), fallback);
      else fallback();
    },
    'share-summary': () => navigator.share({ text: document.getElementById('sum-text').value }).catch(() => {}),
    'timer-add': el => Timer.add(Number(el.dataset.s)),
    'timer-stop': () => Timer.stop(),
    export: () => {
      const blob = new Blob([Store.exportJSON()], { type: 'application/json' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `gymlog-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
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
    'switch-user': el => { Store.switchUser(el.dataset.id); Timer.stop(); Store.migrate(); toast(`Perfil: ${Store.currentUser().name}`); go('#/'); render(); },
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
    const val = d.f === 'band' || d.xf === 'band' || d.xf === 'note' ? t.value : t.value === '' ? '' : Number(t.value);
    if (d.f) { // serie del entreno en curso
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
    } else if ('xs' in d) { routineOf(t).days[d.di].exercises[d.xi].superset = t.checked; save(); }
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
      document.getElementById('energy').innerHTML = energyHTML();
    }
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

  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('sw.js');
  }
})();
