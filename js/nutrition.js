// Kilos levantados, comparaciones motivacionales y consejos de comida.
// Orientativo, basado en las recomendaciones habituales de nutrición deportiva.
const Nutrition = (() => {
  const LEGS = ['Cuádriceps', 'Isquios', 'Glúteo', 'Gemelos', 'Aductores'];

  // Peso real movido: por lado ×2, dos mancuernas ×2 (salvo unilateral).
  function lifted(w) {
    return w.exercises.reduce((a, e) => {
      const ex = Store.exercise(e.exId), st = Store.exSettings(e.exId);
      const f = st.mode === 'lado' ? 2 : st.mode === 'mancuerna' && !ex.unilateral ? 2 : 1;
      const warm = (e.warmup || []).filter(s => s.done);
      return a + e.sets.concat(warm).reduce((b, s) => b + (Number(s.kg) || 0) * (Number(s.reps) || 0) * f, 0);
    }, 0);
  }

  const THINGS = [
    [150000, 'ballena azul', 'ballenas azules', '🐋'],
    [12000, 'autobús', 'autobuses', '🚌'],
    [5000, 'elefante', 'elefantes', '🐘'],
    [1200, 'coche', 'coches', '🚗'],
    [500, 'caballo', 'caballos', '🐎'],
    [400, 'piano de cola', 'pianos de cola', '🎹'],
    [180, 'moto', 'motos', '🏍️'],
    [100, 'oso panda', 'osos panda', '🐼'],
    [30, 'labrador', 'labradores', '🐕'],
    [4, 'gato', 'gatos', '🐈'],
  ];
  function compare(kg) {
    const t = THINGS.find(([w]) => kg / w >= 1) || THINGS[THINGS.length - 1];
    const n = kg / t[0];
    const count = n >= 10 ? Math.round(n) : Math.round(n * 10) / 10;
    return { count, name: count === 1 ? t[1] : t[2], emoji: t[3], icons: Math.max(1, Math.min(10, Math.floor(n))) };
  }

  // Demanda de glucógeno de la sesión.
  function demand(w) {
    if (['hiit', 'pierna', 'fullbody'].includes(w.type)) return 'alta';
    if (['descarga', 'potencia'].includes(w.type)) return 'baja';
    let legs = 0, all = 0;
    w.exercises.forEach(e => {
      const n = e.sets.length; all += n;
      if (Store.exercise(e.exId).primary.some(m => LEGS.includes(m))) legs += n;
    });
    return all && legs / all >= 0.5 ? 'alta' : 'media';
  }

  const MEALS = {
    alta: ['Arroz con pollo y verduras salteadas', 'Patata asada con 2–3 huevos y ensalada', 'Pasta integral con atún, tomate y aceite de oliva',
      'Tostadas de pan integral con tortilla francesa y una fruta', 'Yogur griego con avena, plátano y frutos rojos'],
    media: ['Salmón con quinoa y brócoli', 'Lentejas estofadas con verduras', 'Tortilla de patata con ensalada grande',
      'Skyr con fruta y un puñado de nueces', 'Revuelto de huevos con setas y pan integral'],
    baja: ['Merluza al horno con verduras asadas', 'Ensalada completa con garbanzos y huevo duro',
      'Pechuga a la plancha con calabacín y un puñado de almendras', 'Skyr con frutos rojos y semillas'],
  };
  const SNACKS = ['Fruta + puñado de frutos secos', 'Queso fresco batido con canela', 'Hummus con crudités', 'Kéfir o yogur natural'];
  const CARBS = { alta: [0.8, 1.2], media: [0.5, 0.8], baja: [0.2, 0.4] };
  const LABEL = { alta: 'Alta (pierna / full body / HIIT)', media: 'Media (tren superior)', baja: 'Baja (descarga / técnica)' };

  // Gasto diario estimado (Mifflin-St Jeor × actividad) y objetivo según la meta.
  const GOAL_ADJ = { recomposicion: -0.1, hipertrofia: 0.07, fuerza: 0.05, salud: 0 };
  function energy() {
    const st = Store.get().settings, p = Store.get().profile || {};
    const w = Number(st.bodyweight), h = Number(st.height), a = Number(st.age);
    if (!w || !h || !a) return null;
    const sexAdj = st.sex === 'hombre' ? 5 : st.sex === 'mujer' ? -161 : -78;
    const bmr = 10 * w + 6.25 * h - 5 * a + sexAdj;
    const days = Number(p.days) || 3;
    const factor = days <= 2 ? 1.375 : days <= 5 ? 1.55 : 1.725;
    const tdee = bmr * factor;
    const target = tdee * (1 + (GOAL_ADJ[p.goal] ?? 0));
    const r = x => Math.round(x / 10) * 10;
    return { bmr: r(bmr), tdee: r(tdee), target: r(target), protein: [Math.round(1.6 * w), Math.round(2.2 * w)], goal: p.goal || 'salud' };
  }

  function advice(w) {
    const bw = Number(Store.get().settings.bodyweight) || 0;
    const en = energy();
    const d = demand(w);
    const g = (a, b) => bw ? `${Math.round(a * bw)}–${Math.round(b * bw)} g` : null;
    const hours = Math.max(0.5, (w.end - w.start) / 3600e3);
    const pick = arr => arr.slice((w.start / 864e5 | 0) % arr.length).concat(arr).slice(0, 3);
    const kcal = Number(w.kcal) || 0;
    // Con objetivo calculado, el entreno "normal" ya está incluido: solo se suma lo que pase de una sesión típica (~300 kcal).
    const extra = kcal ? Math.round((en ? Math.max(0, kcal - 300) : kcal) * 0.5 / 10) * 10 : 0;
    const kcalMsg = !kcal ? null
      : en ? (extra
        ? `Tu reloj marca ${kcal} kcal, más que una sesión típica. Sobre tu objetivo de ~${en.target} kcal añade unas ${extra} kcal hoy, mejor en hidratos alrededor del entreno (≈${Math.round(extra * 0.7 / 4)} g).`
        : `Tu reloj marca ${kcal} kcal: una sesión normal, ya incluida en tu objetivo de ~${en.target} kcal. No hace falta comer de más.`)
      : `Tu reloj marca ${kcal} kcal. Suele sobreestimar un 20–30 %, así que en recomposición no las recuperes todas: unas ${extra} kcal extra hoy son suficientes, mejor en forma de hidratos alrededor del entreno (≈${Math.round(extra * 0.7 / 4)} g).`;

    return {
      demand: d, label: LABEL[d],
      post: [
        `Proteína: ${g(0.3, 0.4) || '25–40 g'} en las 2 h siguientes.`,
        `Hidratos: ${g(...CARBS[d]) || { alta: 'una ración generosa', media: 'una ración moderada', baja: 'una ración pequeña' }[d]} (arroz, patata, pan integral, avena, fruta).`,
      ],
      meals: pick(MEALS[d]),
      day: [
        ...(en ? [`Energía del día: ~${en.target} kcal (gasto estimado ${en.tdee} kcal, ajustado a tu objetivo).`] : []),
        `Proteína del día: ${g(1.6, 2.2) || '1,6–2,2 g por kg de peso'} repartida en 3–4 tomas.`,
        'Verdura en comida y cena, y 2–3 piezas de fruta.',
        `Agua: repón unos ${Math.round(hours * 500 / 50) * 50}–${Math.round(hours * 750 / 50) * 50} ml extra por lo entrenado.`,
        'Creatina: 3–5 g al día, a cualquier hora, si la tomas.',
        `Picoteo útil: ${SNACKS[(w.start / 864e5 | 0) % SNACKS.length]}.`,
      ],
      kcal: kcalMsg,
      needsWeight: !bw, needsBody: !en,
    };
  }

  return { lifted, compare, advice, demand, energy };
})();
