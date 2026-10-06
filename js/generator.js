// Generador de rutinas por objetivo, días y máquinas disponibles.
const Generator = (() => {
  const GOALS = {
    recomposicion: { label: 'Recomposición', comp: { sets: 3, repMin: 6, repMax: 10, rir: 2, rest: 150 }, iso: { sets: 3, repMin: 10, repMax: 15, rir: 1, rest: 90 } },
    hipertrofia: { label: 'Hipertrofia', comp: { sets: 3, repMin: 8, repMax: 12, rir: 2, rest: 150 }, iso: { sets: 3, repMin: 10, repMax: 15, rir: 1, rest: 90 } },
    fuerza: { label: 'Fuerza', comp: { sets: 4, repMin: 4, repMax: 6, rir: 2, rest: 180 }, iso: { sets: 3, repMin: 8, repMax: 12, rir: 1, rest: 90 } },
    salud: { label: 'Salud general', comp: { sets: 3, repMin: 8, repMax: 12, rir: 3, rest: 120 }, iso: { sets: 2, repMin: 12, repMax: 15, rir: 2, rest: 75 } },
  };
  const LEVELS = { principiante: 'Principiante', intermedio: 'Intermedio', avanzado: 'Avanzado' };
  const BRANDS = ['Hammer Strength', 'Matrix', 'Genérico'];

  const UPPER_A = ['press_horizontal', 'row', 'press_vertical', 'pull_vertical', 'lateral_raise', 'triceps', 'biceps'];
  const UPPER_B = ['press_incline', 'pull_vertical', 'row', 'fly', 'rear_delt', 'biceps', 'triceps'];
  const LOWER_A = ['squat', 'hinge', 'knee_ext', 'knee_flex', 'calf', 'core'];
  const LOWER_B = ['hinge', 'squat', 'knee_flex', 'abduction', 'calf', 'core'];
  const PUSH = ['press_incline', 'press_vertical', 'press_horizontal', 'fly', 'lateral_raise', 'triceps'];
  const PULL = ['pull_vertical', 'row', 'row', 'rear_delt', 'biceps', 'biceps'];
  const SPLITS = {
    2: { name: 'Full body', days: [['Full body A', ['squat', 'press_horizontal', 'row', 'knee_flex', 'lateral_raise', 'triceps', 'core']], ['Full body B', ['hinge', 'pull_vertical', 'press_incline', 'knee_ext', 'rear_delt', 'biceps', 'calf']]] },
    3: { name: 'Full body', days: [['Full body A', ['squat', 'press_horizontal', 'row', 'knee_flex', 'lateral_raise', 'triceps', 'core']], ['Full body B', ['hinge', 'pull_vertical', 'press_incline', 'knee_ext', 'rear_delt', 'biceps', 'calf']], ['Full body C', ['squat', 'press_vertical', 'row', 'hinge', 'fly', 'biceps', 'core']]] },
    4: { name: 'Torso / Pierna', days: [['Torso A', UPPER_A], ['Pierna A', LOWER_A], ['Torso B', UPPER_B], ['Pierna B', LOWER_B]] },
    5: { name: 'Torso / Pierna + PPL', days: [['Torso', UPPER_A], ['Pierna A', LOWER_A], ['Empuje', PUSH], ['Tirón', PULL], ['Pierna B', LOWER_B]] },
    6: { name: 'Empuje / Tirón / Pierna', days: [['Empuje A', PUSH], ['Tirón A', PULL], ['Pierna A', LOWER_A], ['Empuje B', UPPER_B.filter(p => !['pull_vertical', 'row', 'rear_delt', 'biceps'].includes(p)).concat(['press_vertical', 'lateral_raise'])], ['Tirón B', ['row', 'pull_vertical', 'rear_delt', 'biceps', 'core']], ['Pierna B', LOWER_B]] },
  };

  function targetFor(ex, goal = 'recomposicion', level = 'intermedio') {
    const g = GOALS[goal] || GOALS.recomposicion;
    const t = Object.assign({}, ex.compound ? g.comp : g.iso);
    if (level === 'principiante' && !ex.compound) t.sets = Math.max(2, t.sets - 1);
    if (level === 'avanzado' && !ex.compound) t.sets += 1;
    return t;
  }

  // Intercala marcas para que A y B usen máquinas distintas.
  function poolFor(pattern, brands) {
    const byBrand = brands.map(b => Store.allExercises().filter(e => e.brand === b && e.pattern === pattern));
    const out = [];
    for (let i = 0; byBrand.some(l => i < l.length); i++) byBrand.forEach(l => l[i] && out.push(l[i]));
    // Las máquinas propias siempre entran, al principio.
    const excluded = Store.get().profile?.excluded || [];
    return Store.get().customExercises.filter(e => e.pattern === pattern).concat(out).filter(e => !excluded.includes(e.id));
  }

  function generate({ goal, days, level, brands }) {
    const split = SPLITS[days] || SPLITS[4];
    const used = {};
    const routine = {
      id: Store.uid(), goal, createdAt: Date.now(),
      name: `${GOALS[goal].label} · ${split.name} (${days} días)`,
      days: split.days.map(([name, patterns]) => {
        const chosen = [];
        patterns.forEach(p => {
          const pool = poolFor(p, brands).filter(e => !chosen.some(c => c.exId === e.id));
          if (!pool.length) return;
          const ex = pool[(used[p] = (used[p] ?? -1) + 1) % pool.length];
          chosen.push(Object.assign({ exId: ex.id }, targetFor(ex, goal, level)));
        });
        return { name, icon: Icons.dayIconFor(name), exercises: chosen };
      }),
    };
    return routine;
  }

  // Series semanales por músculo (principal = 1, secundario = 0,5).
  function weeklyVolume(routine) {
    const v = {};
    routine.days.forEach(d => d.exercises.forEach(x => {
      const ex = Store.exercise(x.exId);
      ex.primary.forEach(m => v[m] = (v[m] || 0) + Number(x.sets));
      ex.secondary.forEach(m => v[m] = (v[m] || 0) + Number(x.sets) / 2);
    }));
    return v;
  }

  // Ejercicios que trabajan lo mismo: mismo patrón, ordenados por músculo compartido y por historial.
  function alternatives(exId, limit = 6, avoid = []) {
    const ex = Store.exercise(exId);
    const brands = Store.get().profile?.brands || BRANDS;
    const excluded = Store.get().profile?.excluded || [];
    const familiar = new Set(Store.get().routines.flatMap(r => r.days.flatMap(d => d.exercises.map(x => x.exId))));
    const score = e => e.primary.filter(m => ex.primary.includes(m)).length * 2
      + (Progression.historyFor(e.id).length ? 3 : 0) + (familiar.has(e.id) ? 2 : 0) + (e.custom ? 1 : 0);
    return Store.allExercises()
      .filter(e => e.id !== exId && !avoid.includes(e.id) && e.pattern === ex.pattern && !excluded.includes(e.id) && (e.custom || brands.includes(e.brand)))
      .sort((a, b) => score(b) - score(a))
      .slice(0, limit);
  }

  return { GOALS, LEVELS, BRANDS, generate, targetFor, weeklyVolume, poolFor, alternatives };
})();
