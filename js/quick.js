// Entrenos rápidos para días especiales.
const Quick = (() => {
  const TYPES = {
    fullbody: { icon: '⚡', label: 'Full body', desc: 'Todo el cuerpo en ~35 min', grad: 'push' },
    calistenia: { icon: '🏠', label: 'Full body sin material', desc: 'Calistenia · ~35 min', grad: 'legs' },
    torso: { icon: '💪', label: 'Tren superior', desc: 'Pecho, espalda, hombro y brazos', grad: 'pull' },
    hiit: { icon: '🔥', label: 'HIIT', desc: 'Intervalos 40/20 · ~20 min', grad: 'power' },
    pierna: { icon: '🦵', label: 'Solo pierna', desc: 'Cuádriceps, glúteo y femoral', grad: 'legs' },
    potencia: { icon: '🤸', label: 'Potencia y equilibrio', desc: 'Explosividad y estabilidad', grad: 'glute' },
    movilidad: { icon: '🐾', label: 'Movilidad y Animal Flow', desc: 'Sin material · ~20 min', grad: 'core' },
    core: { icon: '🎯', label: 'Core exprés', desc: '5 ejercicios · ~15 min', grad: 'core' },
    custom: { icon: '🎛️', label: 'Diséñalo tú', desc: 'Tiempo, zona y material', grad: 'push' },
    descarga: { icon: '🔋', label: 'Descarga', desc: 'Tu próximo día, suave', grad: 'core' },
  };

  // Core por tipos: flexión / anti-extensión, rotación / anti-rotación, lateral.
  // Lo usan el remate de core, el Core exprés y «Diséñalo tú». Respeta ⛔ Evitar de cada perfil.
  const CORE = [
    ['g-dead-bug', 'g-cable-crunch', 'g-reverse-crunch', 'g-weighted-situp', 'g-high-plank', 'hss-ab-crunch', 'g-hollow', 'g-plank', 'af-beast-hold', 'g-bird-dog',
      'g-ab-wheel', 'g-captain-chair', 'g-shoulder-tap', 'g-stir-pot', 'g-plank-saw'],
    ['g-pallof', 'g-russian-twist', 'g-cable-woodchop', 'g-bicycle', 'g-cable-pallof', 'af-side-kick', 'g-db-woodchop', 'hs-combo-twist'],
    ['g-kb-side-bend', 'g-side-plank-hand', 'g-suitcase-carry', 'g-side-plank', 'g-heel-touch', 'g-db-side-bend', 'g-side-plank-dip', 'g-farmer-carry'],
  ];

  // «Diséñalo tú»: qué trabajar (huecos por patrón; «patrón:Músculo» = ese músculo como principal) y material.
  const FOCUS = {
    full: { label: 'Todo el cuerpo', slots: ['squat', 'press_horizontal', 'row', 'hinge', 'pull_vertical', 'press_vertical', 'knee_flex', 'lateral_raise', 'hinge:Glúteo', 'biceps', 'triceps', 'calf'] },
    torso: { label: 'Tren superior', slots: ['press_horizontal', 'row', 'press_vertical', 'pull_vertical', 'lateral_raise', 'rear_delt', 'biceps', 'triceps', 'press_incline', 'fly'] },
    pierna: { label: 'Pierna', slots: ['squat', 'hinge', 'knee_flex', 'knee_ext', 'squat', 'abduction', 'calf', 'hinge:Glúteo', 'adduction'] },
    gluteo: { label: 'Glúteo', slots: ['hinge:Glúteo', 'squat', 'abduction', 'hinge', 'hinge:Glúteo', 'abduction', 'squat'] },
    espalda: { label: 'Espalda', slots: ['pull_vertical', 'row', 'rear_delt', 'row', 'pull_vertical', 'biceps'] },
    pecho: { label: 'Pecho y hombro', slots: ['press_horizontal', 'press_vertical', 'lateral_raise', 'press_incline', 'fly', 'rear_delt', 'triceps'] },
    brazos: { label: 'Brazos', slots: ['biceps', 'triceps', 'biceps', 'triceps', 'biceps', 'triceps'] },
    core: { label: 'Core', slots: ['core:0', 'core:1', 'core:2', 'core:0', 'core:1', 'core:2'] },
  };
  const GEAR = {
    maquinas: { label: 'Máquinas', loads: ['plates', 'stack'] },
    libres: { label: 'Peso libre', loads: ['dumbbell', 'barbell', 'implement'] },
    polea: { label: 'Poleas', loads: ['cable'] },
    gomas: { label: 'Gomas', loads: ['band'] },
    cuerpo: { label: 'Sin material', loads: ['bodyweight', 'hold'] },
  };
  const MINUTES = [15, 20, 30, 45, 60];

  const excluded = () => Store.get().profile?.excluded || [];
  const brands = () => Store.get().profile?.brands || Generator.BRANDS;

  // Prioriza ejercicios que ya haces (tienen historial y referencia de peso).
  function pick(pattern, avoid) {
    const familiar = new Set(Store.get().routines.flatMap(r => r.days.flatMap(d => d.exercises.map(x => x.exId))));
    const pool = Generator.poolFor(pattern, brands()).filter(e => !avoid.includes(e.id));
    const withHist = pool.filter(e => Progression.historyFor(e.id).length);
    return withHist[0] || pool.find(e => familiar.has(e.id)) || pool[0];
  }
  function refKg(exId) {
    for (const r of Store.get().routines) for (const d of r.days) for (const x of d.exercises) if (x.exId === exId && x.kg !== '' && x.kg != null) return x;
    return {};
  }

  function fromPatterns(patterns, tweak = t => t) {
    const avoid = [];
    const goal = Store.get().profile?.goal, level = Store.get().profile?.level;
    return patterns.map(p => {
      const ex = pick(p, avoid);
      if (!ex) return null;
      avoid.push(ex.id);
      return { exId: ex.id, target: tweak(Generator.targetFor(ex, goal, level), ex), ref: refKg(ex.id) };
    }).filter(Boolean);
  }

  // Cada hueco: el primer ejercicio de la lista que no esté en ⛔ Evitar.
  const SLOTS = list => list.map(([ids, ...rest]) => [ids.find(id => !excluded().includes(id)), ...rest]).filter(([id]) => id);

  const FIXED = (list) => list
    .filter(([id]) => !excluded().includes(id))
    .map(([exId, sets, repMin, repMax, rir, rest, note, secs]) => ({ exId, target: { sets, repMin, repMax, rir, rest, secs }, ref: { note } }));

  function build(type, routine, nextDay) {
    switch (type) {
      case 'fullbody':
        // 35 min: básicos a 3 series, accesorios a 2.
        return fromPatterns(['squat', 'press_horizontal', 'row', 'hinge', 'pull_vertical', 'press_vertical', 'knee_flex'],
          (t, ex) => Object.assign(t, { sets: ex.compound ? 3 : 2, rest: ex.compound ? 120 : 60 }));
      case 'torso':
        // 35 min: empuje y tirón alternados, brazos al final.
        return fromPatterns(['press_horizontal', 'row', 'press_vertical', 'pull_vertical', 'lateral_raise', 'biceps', 'triceps'],
          (t, ex) => Object.assign(t, { sets: ex.compound ? 3 : 2, rest: ex.compound ? 120 : 60 }));
      case 'pierna':
        return fromPatterns(['squat', 'hinge', 'squat', 'knee_flex', 'knee_ext', 'abduction', 'calf'],
          (t, ex) => Object.assign(t, { rest: ex.compound ? 120 : 60 }));
      case 'potencia':
        return FIXED([
          ['g-box-jump', 3, 4, 6, 3, 90, 'Calidad > cantidad: aterriza suave y baja del cajón andando.'],
          ['g-kb-swing', 3, 10, 12, 3, 75, 'Bisagra de cadera, espalda neutra. ⚠️ Si molesta la lumbar, cámbialo.'],
          ['g-skater', 3, 6, 8, 3, 60, 'Por lado. Aguanta 1 s el aterrizaje sin perder el equilibrio.'],
          ['g-sl-rdl', 3, 8, 10, 2, 60, 'Por pierna. Lento y controlado, cadera nivelada.'],
          ['af-traveling-ape', 3, 4, 6, 3, 60, 'Animal Flow. 4 pasos a cada lado: caderas bajas, manos al suelo y salto lateral suave.'],
          ['g-sl-reach', 2, 8, 10, 2, 45, 'Por pierna. Alcanza en 3 direcciones sin apoyar el otro pie.'],
          ['g-pallof', 2, 10, 12, 2, 45, 'Por lado. Resiste la rotación.'],
        ]);
      case 'calistenia':
        // Full body con el peso del cuerpo: pierna, empuje, glúteo, tirón, unilateral, hombro, core y un remate.
        return FIXED(SLOTS([
          [['g-air-squat', 'g-jump-squat', 'g-wall-sit'], 3, 15, 20, 2, 60, 'Baja en 3 s, espalda neutra. ¿Fácil? Pausa 2 s abajo o pasa a sentadilla con salto.', 45],
          [['g-pushup', 'g-incline-pushup', 'g-close-pushup'], 3, 8, 15, 2, 75, 'Cuerpo en bloque. ¿No llegas a 8? Manos en un banco o una mesa.'],
          [['g-sl-glute-bridge', 'g-glute-bridge', 'g-frog-pump'], 3, 10, 15, 2, 60, 'Por pierna. Aprieta el glúteo 1 s arriba.'],
          [['g-inverted-row', 'g-pullup', 'g-superman'], 3, 8, 12, 2, 75, 'Bajo una mesa firme, una barra baja o un TRX. Sin dónde agarrarte: cámbialo por superman.'],
          [['g-sl-box-squat', 'g-cossack', 'g-split-jump'], 3, 8, 12, 2, 60, 'Por pierna. Siéntate despacio en un banco o una silla y sube sin impulso.'],
          [['g-pike-pushup', 'af-traveling-beast', 'g-shoulder-tap'], 3, 6, 10, 2, 60, 'Cadera alta y cabeza hacia el suelo entre las manos. Baja controlada.'],
          [['g-hollow', 'af-beast-hold', 'g-high-plank'], 3, 0, 0, 2, 45, 'Zona lumbar pegada al suelo; si cuesta, dobla las rodillas.', 30],
          [['g-bicycle', 'g-heel-touch', 'g-v-up'], 2, 12, 20, 2, 45, 'Por lado, lento y sin tirar del cuello.'],
          [['g-burpee', 'g-mountain-climber', 'g-high-knees'], 2, 8, 12, 3, 60, 'Ritmo constante y aterrizaje suave. Sin impacto: quita el salto.'],
        ]));
      case 'movilidad':
        // Circuito suave: cuadrupedias y transiciones de Animal Flow con apoyo en manos (nunca en codos).
        return FIXED([
          ['af-wrist-prep', 1, 10, 10, 3, 20, 'Círculos y balanceos de muñeca en cuadrupedia: prepara el apoyo en manos.'],
          ['g-cat-cow', 1, 8, 10, 3, 20, 'Lento, siguiendo la respiración.'],
          ['af-beast-hold', 3, 0, 0, 3, 30, 'Rodillas a 2–3 cm del suelo, espalda plana, empuja el suelo con las manos.', 20],
          ['af-loaded-beast', 2, 6, 8, 3, 30, 'Desde beast, lleva la cadera atrás hacia los talones y vuelve.'],
          ['af-crab-reach', 2, 4, 6, 3, 30, 'Por lado. Empuja con la cadera hacia el techo y alcanza por encima.'],
          ['af-side-kick', 2, 4, 6, 3, 30, 'Por lado. Desde beast, gira y pasa la pierna por debajo, sin prisa.'],
          ['af-scorpion', 2, 4, 6, 3, 30, 'Por lado. Desde beast, lleva el pie hacia la mano contraria por encima.'],
          ['af-ape-reach', 2, 4, 6, 3, 30, 'Sentadilla profunda: caderas bajas y alcance largo hacia delante.'],
          ['g-90-90', 1, 6, 8, 3, 20, 'Por lado. Pecho alto al cambiar de lado.'],
          ['g-worlds-greatest', 1, 4, 5, 3, 20, 'Por lado. Zancada, mano por dentro del pie y rotación hacia el techo.'],
        ]);
      case 'hiit':
        return FIXED([
          ['g-bike-sprint', 4, 0, 0, 0, 0, 'A tope en el trabajo, pedaleo suave en el descanso.'],
          ['g-jump-squat', 4, 0, 0, 0, 0, 'Aterriza suave. Alternativa sin impacto: sentadilla rápida.'],
          ['g-rower', 4, 0, 0, 0, 0, 'Empuja con piernas, luego tira.'],
          ['g-mountain-climber', 4, 0, 0, 0, 0, 'Manos bajo los hombros, brazos estirados (sin apoyar codos).'],
        ]);
      case 'core':
        // Un ejercicio de cada tipo y otra vuelta a los dos primeros; cambian de un entreno de core a otro.
        return ['core:0', 'core:1', 'core:2', 'core:0', 'core:1'].reduce((out, slot, i) => {
          const ex = pickFor(slot, null, out.map(x => x.exId), 0);
          if (ex) out.push({ exId: ex.id, target: { sets: i < 3 ? 3 : 2, repMin: 10, repMax: 15, rir: 2, rest: 40, secs: 30 }, ref: { note: ex.unilateral ? 'Por lado.' : '' } });
          return out;
        }, []);
      case 'descarga': {
        if (!routine) return [];
        // Mismo peso, mitad de series y lejos del fallo (RIR 3–4).
        return routine.days[nextDay].exercises.map(x => {
          const last = Progression.historyFor(x.exId)[0];
          const kg = last ? Progression.topWeight(last.sets) : x.kg;
          return { exId: x.exId,
            target: { sets: Math.max(1, Math.ceil(x.sets / 2)), repMin: x.repMin, repMax: x.repMax, rir: Math.max(3, Number(x.rir) + 2), rest: x.rest, secs: x.secs },
            ref: { kg, note: x.note, band: x.band }, deload: true };
        });
      }
    }
    return [];
  }

  // Candidatos de un hueco, los que ya haces primero (con historial, luego los de tus rutinas).
  // `seed` rota entre los candidatos para «Otra propuesta»; el core rota además entre entrenos.
  function candidates(slot, loads) {
    const okLoad = e => !loads || loads.includes(e.load);
    const [pattern, arg] = slot.split(':');
    if (pattern === 'core') {
      const ok = id => { const e = Store.exercise(id); return !excluded().includes(id) && okLoad(e) && (e.custom || brands().includes(e.brand)); };
      const list = CORE[arg].filter(ok);
      return list.length ? list.map(Store.exercise) : Generator.poolFor('core', brands()).filter(okLoad);
    }
    const familiar = new Set(Store.get().routines.flatMap(r => r.days.flatMap(d => d.exercises.map(x => x.exId))));
    const rank = e => (Progression.historyFor(e.id).length ? 2 : 0) + (familiar.has(e.id) ? 1 : 0);
    return Generator.poolFor(pattern, brands()).filter(e => okLoad(e) && (!arg || e.primary.includes(arg)))
      .map((e, i) => [e, rank(e), i]).sort((a, b) => b[1] - a[1] || a[2] - b[2]).map(([e]) => e);
  }
  function pickFor(slot, loads, avoid, seed) {
    const pool = candidates(slot, loads).filter(e => !avoid.includes(e.id));
    if (!pool.length) return null;
    const rot = slot.startsWith('core') ? Store.get().workouts.filter(w => ['core', 'custom'].includes(w.type)).length : 0;
    return pool[(seed + rot) % pool.length];
  }

  // Series y descanso de cada ejercicio según el tiempo disponible; segundos que cuesta (series + cambio).
  function targetIn(ex, mins, coreOnly) {
    const goal = Store.get().profile?.goal, level = Store.get().profile?.level;
    const sets = mins >= 45 ? 3 : 2;
    const t = Object.assign(Generator.targetFor(ex, goal, level), { sets, rest: ex.compound ? (mins >= 60 ? 120 : 90) : 60 });
    if (ex.pattern === 'core') Object.assign(t, { sets: coreOnly || mins <= 20 ? 3 : 2, repMin: 10, repMax: 15, rir: 2, rest: 40, secs: 30 });
    const work = (ex.unilateral ? 1.7 : 1) * 30;
    return [t, t.sets * (work + t.rest) + 45];
  }

  // Entreno a medida: reparte el tiempo entre las zonas elegidas; el core siempre al final.
  function custom({ mins = 30, focus = ['full'], gear = Object.keys(GEAR), seed = 0 }) {
    const loads = gear.flatMap(g => GEAR[g]?.loads || []);
    const zones = focus.filter(f => FOCUS[f] && f !== 'core'), withCore = focus.includes('core');
    // Huecos intercalados: uno de cada zona por turno.
    const main = [];
    for (let i = 0; zones.some(z => i < FOCUS[z].slots.length); i++) zones.forEach(z => FOCUS[z].slots[i] && main.push(FOCUS[z].slots[i]));
    const budget = mins * 60, avoid = [], picked = [];
    let used = 0;
    const fill = (slots, limit, max = Infinity) => {
      let n = 0;
      for (const slot of slots) {
        if (n >= max) break;
        const ex = pickFor(slot, loads, avoid, seed);
        if (!ex) continue;
        const [target, cost] = targetIn(ex, mins, !zones.length);
        if (used + cost > limit && picked.length) continue;
        avoid.push(ex.id); used += cost; n++;
        picked.push({ exId: ex.id, target, ref: refKg(ex.id) });
      }
    };
    // Con core y otra zona: el core se queda ~1/4 del tiempo (mínimo 2 ejercicios).
    fill(main, withCore && zones.length ? budget * .75 : budget);
    // Los básicos (multiarticulares) primero, con energía; el orden entre ellos se mantiene.
    picked.sort((a, b) => !!Store.exercise(b.exId).compound - !!Store.exercise(a.exId).compound);
    if (withCore) fill(FOCUS.core.slots.concat(FOCUS.core.slots), budget, zones.length ? Math.max(2, Math.round(mins / 15)) : Infinity);
    return { items: picked, mins: Math.round(used / 60), noPrep: !zones.length };
  }

  const HIIT = { work: 40, rest: 20, rounds: 4 };

  return { TYPES, FOCUS, GEAR, MINUTES, CORE, build, custom, HIIT };
})();
