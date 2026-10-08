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
    descarga: { icon: '🔋', label: 'Descarga', desc: 'Tu próximo día, suave', grad: 'core' },
  };

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

  const HIIT = { work: 40, rest: 20, rounds: 4 };

  return { TYPES, build, HIIT };
})();
