// Catálogo de ejercicios/máquinas.
// load: 'plates' (discos), 'stack' (placas con pin), 'dumbbell', 'barbell', 'cable', 'bodyweight'
// pattern: patrón de movimiento usado por el generador de rutinas.
// Los nombres de modelo pueden variar según el gimnasio: se pueden añadir máquinas propias desde la app.

const PATTERNS = {
  press_horizontal: 'Empuje horizontal',
  press_incline: 'Empuje inclinado',
  press_vertical: 'Empuje vertical',
  fly: 'Aperturas',
  pull_vertical: 'Tirón vertical',
  row: 'Remo',
  rear_delt: 'Deltoides posterior',
  lateral_raise: 'Elevaciones laterales',
  biceps: 'Bíceps',
  triceps: 'Tríceps',
  squat: 'Dominante de rodilla',
  hinge: 'Dominante de cadera',
  knee_ext: 'Extensión de rodilla',
  knee_flex: 'Flexión de rodilla',
  abduction: 'Abducción',
  adduction: 'Aducción',
  calf: 'Gemelos',
  core: 'Core',
  power: 'Potencia',
  balance: 'Equilibrio',
  cardio: 'Cardio / HIIT',
};

const MUSCLES = ['Pecho', 'Dorsal', 'Espalda alta', 'Hombro', 'Hombro posterior', 'Bíceps', 'Tríceps',
  'Cuádriceps', 'Isquios', 'Glúteo', 'Gemelos', 'Aductores', 'Abdomen', 'Lumbar'];

const LOAD_TYPES = {
  plates: 'Discos',
  stack: 'Placas (pin)',
  dumbbell: 'Mancuernas',
  barbell: 'Barra',
  cable: 'Polea',
  bodyweight: 'Peso corporal',
  implement: 'Kettlebell / balón',
  band: 'Goma elástica',
  hold: 'Isométrico (por tiempo)',
};

// Gomas de resistencia, de más suave a más dura (orden habitual tipo Theraband; varía según la marca).
const BANDS = {
  amarilla: { label: 'Amarilla', dot: '🟡' },
  roja: { label: 'Roja', dot: '🔴' },
  verde: { label: 'Verde', dot: '🟢' },
  azul: { label: 'Azul', dot: '🔵' },
  negra: { label: 'Negra', dot: '⚫' },
  plateada: { label: 'Plateada', dot: '⚪' },
};
// Duraciones para los ejercicios por tiempo (planchas…).
const HOLD_STEPS = [20, 30, 45, 60, 75, 90, 120];

const MACHINES = (() => {
  const list = [];
  const add = (brand, line, id, name, pattern, load, primary, secondary = [], opts = {}) =>
    list.push({ id, name, brand, line, pattern, load, primary, secondary,
      compound: opts.compound ?? ['press_horizontal', 'press_incline', 'press_vertical', 'pull_vertical', 'row', 'squat', 'hinge'].includes(pattern),
      unilateral: !!opts.unilateral });

  // ---------- Hammer Strength · Plate-Loaded ----------
  const HP = (...a) => add('Hammer Strength', 'Plate-Loaded', ...a);
  HP('hs-iso-bench', 'Iso-Lateral Bench Press', 'press_horizontal', 'plates', ['Pecho'], ['Tríceps', 'Hombro'], { unilateral: true });
  HP('hs-iso-incline', 'Iso-Lateral Incline Press', 'press_incline', 'plates', ['Pecho'], ['Hombro', 'Tríceps'], { unilateral: true });
  HP('hs-iso-decline', 'Iso-Lateral Decline Press', 'press_horizontal', 'plates', ['Pecho'], ['Tríceps'], { unilateral: true });
  HP('hs-iso-wide-chest', 'Iso-Lateral Wide Chest', 'press_horizontal', 'plates', ['Pecho'], ['Hombro'], { unilateral: true });
  HP('hs-iso-shoulder', 'Iso-Lateral Shoulder Press', 'press_vertical', 'plates', ['Hombro'], ['Tríceps'], { unilateral: true });
  HP('hs-iso-front-pulldown', 'Iso-Lateral Front Lat Pulldown', 'pull_vertical', 'plates', ['Dorsal'], ['Bíceps', 'Espalda alta'], { unilateral: true });
  HP('hs-iso-wide-pulldown', 'Iso-Lateral Wide Pulldown', 'pull_vertical', 'plates', ['Dorsal'], ['Espalda alta', 'Bíceps'], { unilateral: true });
  HP('hs-iso-row', 'Iso-Lateral Row', 'row', 'plates', ['Espalda alta'], ['Dorsal', 'Bíceps'], { unilateral: true });
  HP('hs-iso-low-row', 'Iso-Lateral Low Row', 'row', 'plates', ['Dorsal'], ['Espalda alta', 'Bíceps'], { unilateral: true });
  HP('hs-iso-high-row', 'Iso-Lateral High Row', 'row', 'plates', ['Espalda alta'], ['Dorsal', 'Hombro posterior'], { unilateral: true });
  HP('hs-dy-row', 'Iso-Lateral D.Y. Row', 'row', 'plates', ['Dorsal'], ['Espalda alta', 'Bíceps'], { unilateral: true });
  HP('hs-iso-leg-press', 'Iso-Lateral Leg Press', 'squat', 'plates', ['Cuádriceps'], ['Glúteo', 'Aductores'], { unilateral: true });
  HP('hs-linear-leg-press', 'Linear Leg Press', 'squat', 'plates', ['Cuádriceps'], ['Glúteo', 'Aductores']);
  HP('hs-linear-hack', 'Linear Hack Press', 'squat', 'plates', ['Cuádriceps'], ['Glúteo']);
  HP('hs-v-squat', 'V-Squat', 'squat', 'plates', ['Cuádriceps'], ['Glúteo']);
  HP('hs-squat-lunge', 'Squat Lunge', 'squat', 'plates', ['Cuádriceps', 'Glúteo'], ['Aductores']);
  HP('hs-iso-leg-ext', 'Iso-Lateral Leg Extension', 'knee_ext', 'plates', ['Cuádriceps'], [], { unilateral: true });
  HP('hs-kneeling-curl', 'Iso-Lateral Kneeling Leg Curl', 'knee_flex', 'plates', ['Isquios'], [], { unilateral: true });
  HP('hs-seated-calf', 'Seated Calf Raise', 'calf', 'plates', ['Gemelos']);

  // ---------- Hammer Strength · Select (placas) ----------
  const HS = (...a) => add('Hammer Strength', 'Select', ...a);
  HS('hss-chest-press', 'Chest Press', 'press_horizontal', 'stack', ['Pecho'], ['Tríceps', 'Hombro']);
  HS('hss-shoulder-press', 'Shoulder Press', 'press_vertical', 'stack', ['Hombro'], ['Tríceps']);
  HS('hss-lat-pulldown', 'Lat Pulldown', 'pull_vertical', 'stack', ['Dorsal'], ['Bíceps']);
  HS('hss-seated-row', 'Seated Row', 'row', 'stack', ['Espalda alta'], ['Dorsal', 'Bíceps']);
  HS('hss-pec-fly', 'Pec Fly', 'fly', 'stack', ['Pecho']);
  HS('hss-rear-delt', 'Rear Delt', 'rear_delt', 'stack', ['Hombro posterior'], ['Espalda alta']);
  HS('hss-leg-press', 'Leg Press', 'squat', 'stack', ['Cuádriceps'], ['Glúteo']);
  HS('hss-leg-ext', 'Leg Extension', 'knee_ext', 'stack', ['Cuádriceps']);
  HS('hss-seated-curl', 'Seated Leg Curl', 'knee_flex', 'stack', ['Isquios']);
  HS('hss-prone-curl', 'Prone Leg Curl', 'knee_flex', 'stack', ['Isquios']);
  HS('hss-hip-abduction', 'Hip Abduction', 'abduction', 'stack', ['Glúteo']);
  HS('hss-hip-adduction', 'Hip Adduction', 'adduction', 'stack', ['Aductores']);
  HS('hss-biceps', 'Biceps Curl', 'biceps', 'stack', ['Bíceps']);
  HS('hss-triceps', 'Triceps Extension', 'triceps', 'stack', ['Tríceps']);
  HS('hss-ab-crunch', 'Abdominal Crunch', 'core', 'stack', ['Abdomen']);
  HS('hss-back-ext', 'Back Extension', 'hinge', 'stack', ['Lumbar'], ['Glúteo', 'Isquios'], { compound: false });

  // ---------- Hammer Strength · MTS ----------
  const HM = (...a) => add('Hammer Strength', 'MTS', ...a);
  HM('mts-iso-chest', 'Iso-Lateral Chest Press', 'press_horizontal', 'stack', ['Pecho'], ['Tríceps', 'Hombro'], { unilateral: true });
  HM('mts-iso-incline', 'Iso-Lateral Incline Press', 'press_incline', 'stack', ['Pecho'], ['Hombro', 'Tríceps'], { unilateral: true });
  HM('mts-iso-shoulder', 'Iso-Lateral Shoulder Press', 'press_vertical', 'stack', ['Hombro'], ['Tríceps'], { unilateral: true });
  HM('mts-front-pulldown', 'Iso-Lateral Front Pulldown', 'pull_vertical', 'stack', ['Dorsal'], ['Bíceps'], { unilateral: true });
  HM('mts-iso-row', 'Iso-Lateral Row', 'row', 'stack', ['Espalda alta'], ['Dorsal', 'Bíceps'], { unilateral: true });
  HM('mts-biceps', 'Biceps Curl', 'biceps', 'stack', ['Bíceps']);
  HM('mts-triceps', 'Triceps Extension', 'triceps', 'stack', ['Tríceps']);
  HM('mts-ab-crunch', 'Abdominal Crunch', 'core', 'stack', ['Abdomen']);

  // ---------- Matrix · Ultra (placas) ----------
  const MU = (...a) => add('Matrix', 'Ultra', ...a);
  MU('mu-conv-chest', 'Converging Chest Press', 'press_horizontal', 'stack', ['Pecho'], ['Tríceps', 'Hombro']);
  MU('mu-conv-shoulder', 'Converging Shoulder Press', 'press_vertical', 'stack', ['Hombro'], ['Tríceps']);
  MU('mu-div-pulldown', 'Diverging Lat Pulldown', 'pull_vertical', 'stack', ['Dorsal'], ['Bíceps', 'Espalda alta']);
  MU('mu-div-row', 'Diverging Seated Row', 'row', 'stack', ['Espalda alta'], ['Dorsal', 'Bíceps']);
  MU('mu-pec-fly', 'Pectoral Fly', 'fly', 'stack', ['Pecho']);
  MU('mu-rear-delt', 'Rear Delt', 'rear_delt', 'stack', ['Hombro posterior'], ['Espalda alta']);
  MU('mu-lateral-raise', 'Lateral Raise', 'lateral_raise', 'stack', ['Hombro']);
  MU('mu-leg-press', 'Leg Press', 'squat', 'stack', ['Cuádriceps'], ['Glúteo']);
  MU('mu-leg-ext', 'Leg Extension', 'knee_ext', 'stack', ['Cuádriceps']);
  MU('mu-seated-curl', 'Seated Leg Curl', 'knee_flex', 'stack', ['Isquios']);
  MU('mu-prone-curl', 'Prone Leg Curl', 'knee_flex', 'stack', ['Isquios']);
  MU('mu-glute', 'Glute Trainer', 'hinge', 'stack', ['Glúteo'], ['Isquios'], { compound: false });
  MU('mu-abductor', 'Hip Abductor', 'abduction', 'stack', ['Glúteo']);
  MU('mu-adductor', 'Hip Adductor', 'adduction', 'stack', ['Aductores']);
  MU('mu-calf', 'Calf Extension', 'calf', 'stack', ['Gemelos']);
  MU('mu-biceps', 'Biceps Curl', 'biceps', 'stack', ['Bíceps']);
  MU('mu-triceps', 'Triceps Press', 'triceps', 'stack', ['Tríceps']);
  MU('mu-ab-crunch', 'Abdominal Crunch', 'core', 'stack', ['Abdomen']);
  MU('mu-back-ext', 'Back Extension', 'hinge', 'stack', ['Lumbar'], ['Glúteo'], { compound: false });

  // ---------- Matrix · Magnum (discos) ----------
  const MM = (...a) => add('Matrix', 'Magnum', ...a);
  MM('mm-incline-press', 'Incline Chest Press', 'press_incline', 'plates', ['Pecho'], ['Hombro', 'Tríceps']);
  MM('mm-chest-press', 'Seated Chest Press', 'press_horizontal', 'plates', ['Pecho'], ['Tríceps']);
  MM('mm-lat-pulldown', 'Lat Pulldown', 'pull_vertical', 'plates', ['Dorsal'], ['Bíceps']);
  MM('mm-row', 'Seated Row', 'row', 'plates', ['Espalda alta'], ['Dorsal', 'Bíceps']);
  MM('mm-hack-squat', 'Hack Squat', 'squat', 'plates', ['Cuádriceps'], ['Glúteo']);
  MM('mm-leg-press', 'Leg Press 45°', 'squat', 'plates', ['Cuádriceps'], ['Glúteo', 'Aductores']);
  MM('mm-glute', 'Glute Trainer', 'hinge', 'plates', ['Glúteo'], ['Isquios']);
  MM('mm-seated-calf', 'Seated Calf', 'calf', 'plates', ['Gemelos']);
  MM('mm-decline-press', 'Decline Chest Press', 'press_horizontal', 'plates', ['Pecho'], ['Tríceps']);
  MM('mm-shoulder-press', 'Shoulder Press', 'press_vertical', 'plates', ['Hombro'], ['Tríceps']);
  MM('mm-front-pulldown', 'Front Pulldown', 'pull_vertical', 'plates', ['Dorsal'], ['Bíceps', 'Espalda alta'], { unilateral: true });
  MM('mm-low-row', 'Low Row', 'row', 'plates', ['Dorsal'], ['Espalda alta', 'Bíceps'], { unilateral: true });
  MM('mm-high-row', 'High Row', 'row', 'plates', ['Espalda alta'], ['Dorsal', 'Hombro posterior'], { unilateral: true });
  MM('mm-pendulum', 'Pendulum Squat', 'squat', 'plates', ['Cuádriceps'], ['Glúteo']);
  MM('mm-belt-squat', 'Belt Squat', 'squat', 'plates', ['Cuádriceps', 'Glúteo'], ['Aductores']);
  MM('mm-leg-ext', 'Leg Extension', 'knee_ext', 'plates', ['Cuádriceps']);
  MM('mm-leg-curl', 'Leg Curl', 'knee_flex', 'plates', ['Isquios']);
  MM('mm-hip-thrust', 'Hip Thrust', 'hinge', 'plates', ['Glúteo'], ['Isquios'], { compound: false });
  MM('mm-standing-calf', 'Standing Calf', 'calf', 'plates', ['Gemelos']);

  // ---------- Genérico: peso libre, poleas, multipower ----------
  const G = (...a) => add('Genérico', '', ...a);
  G('g-bench', 'Press banca con barra', 'press_horizontal', 'barbell', ['Pecho'], ['Tríceps', 'Hombro']);
  G('g-db-incline', 'Press inclinado con mancuernas', 'press_incline', 'dumbbell', ['Pecho'], ['Hombro', 'Tríceps']);
  G('g-smith-incline', 'Press inclinado en multipower', 'press_incline', 'barbell', ['Pecho'], ['Hombro', 'Tríceps']);
  G('g-db-shoulder', 'Press militar con mancuernas', 'press_vertical', 'dumbbell', ['Hombro'], ['Tríceps']);
  G('g-dips', 'Fondos en paralelas', 'press_horizontal', 'bodyweight', ['Pecho', 'Tríceps'], ['Hombro']);
  G('g-cable-fly', 'Cruce de poleas', 'fly', 'cable', ['Pecho']);
  G('g-pullup', 'Dominadas', 'pull_vertical', 'bodyweight', ['Dorsal'], ['Bíceps', 'Espalda alta']);
  G('g-cable-row', 'Remo en polea baja', 'row', 'cable', ['Espalda alta'], ['Dorsal', 'Bíceps']);
  G('g-db-row', 'Remo con mancuerna', 'row', 'dumbbell', ['Dorsal'], ['Espalda alta', 'Bíceps'], { unilateral: true });
  G('g-face-pull', 'Face pull en polea', 'rear_delt', 'cable', ['Hombro posterior'], ['Espalda alta']);
  G('g-db-lateral', 'Elevaciones laterales con mancuernas', 'lateral_raise', 'dumbbell', ['Hombro']);
  G('g-cable-lateral', 'Elevación lateral en polea', 'lateral_raise', 'cable', ['Hombro'], [], { unilateral: true });
  G('g-db-curl', 'Curl con mancuernas', 'biceps', 'dumbbell', ['Bíceps']);
  G('g-cable-curl', 'Curl en polea', 'biceps', 'cable', ['Bíceps']);
  G('g-hammer-curl', 'Curl martillo', 'biceps', 'dumbbell', ['Bíceps']);
  G('g-pushdown', 'Extensión de tríceps en polea', 'triceps', 'cable', ['Tríceps']);
  G('g-overhead-ext', 'Extensión de tríceps sobre la cabeza (polea)', 'triceps', 'cable', ['Tríceps']);
  G('g-squat', 'Sentadilla con barra', 'squat', 'barbell', ['Cuádriceps', 'Glúteo'], ['Aductores', 'Lumbar']);
  G('g-smith-squat', 'Sentadilla en multipower', 'squat', 'barbell', ['Cuádriceps'], ['Glúteo']);
  G('g-bulgarian', 'Sentadilla búlgara', 'squat', 'dumbbell', ['Cuádriceps', 'Glúteo'], [], { unilateral: true });
  G('g-rdl', 'Peso muerto rumano', 'hinge', 'barbell', ['Isquios', 'Glúteo'], ['Lumbar']);
  G('g-hip-thrust', 'Hip thrust con barra', 'hinge', 'barbell', ['Glúteo'], ['Isquios']);
  G('g-plank', 'Plancha sobre antebrazos', 'core', 'hold', ['Abdomen']);
  G('g-high-plank', 'Plancha sobre manos', 'core', 'hold', ['Abdomen']);
  G('g-side-plank-hand', 'Plancha lateral sobre mano', 'core', 'hold', ['Abdomen'], [], { unilateral: true });
  G('g-dead-bug', 'Dead bug', 'core', 'bodyweight', ['Abdomen']);
  G('g-pallof', 'Press Pallof', 'core', 'band', ['Abdomen'], [], { unilateral: true });
  G('g-cable-pallof', 'Press Pallof en polea', 'core', 'cable', ['Abdomen'], [], { unilateral: true });
  G('g-band-walk', 'Paseo lateral con goma', 'abduction', 'band', ['Glúteo']);
  G('g-bird-dog', 'Bird dog', 'core', 'bodyweight', ['Abdomen'], ['Lumbar']);
  // Potencia y equilibrio
  G('g-jump-squat', 'Sentadilla con salto', 'power', 'bodyweight', ['Cuádriceps', 'Glúteo']);
  G('g-box-jump', 'Salto al cajón', 'power', 'bodyweight', ['Cuádriceps', 'Glúteo']);
  G('g-kb-swing', 'Swing con kettlebell', 'power', 'implement', ['Glúteo', 'Isquios'], ['Lumbar']);
  G('g-med-ball', 'Lanzamiento de balón medicinal a la pared', 'power', 'implement', ['Pecho', 'Abdomen'], ['Hombro']);
  G('g-skater', 'Saltos laterales (skater)', 'power', 'bodyweight', ['Glúteo', 'Cuádriceps'], [], { unilateral: true });
  G('g-sl-rdl', 'Peso muerto rumano a una pierna', 'balance', 'implement', ['Isquios', 'Glúteo'], [], { unilateral: true });
  G('g-sl-reach', 'Equilibrio a una pierna con alcance', 'balance', 'bodyweight', ['Glúteo'], ['Abdomen'], { unilateral: true });
  G('g-bosu-squat', 'Sentadilla sobre BOSU', 'balance', 'bodyweight', ['Cuádriceps'], ['Abdomen']);
  // Cardio / HIIT
  G('g-bike-sprint', 'Sprint en bici estática', 'cardio', 'bodyweight', ['Cuádriceps']);
  G('g-rower', 'Remo ergómetro', 'cardio', 'bodyweight', ['Espalda alta'], ['Cuádriceps']);
  G('g-mountain-climber', 'Escaladores', 'cardio', 'bodyweight', ['Abdomen']);
  G('g-jumping-jack', 'Jumping jacks', 'cardio', 'bodyweight', ['Gemelos']);
  G('g-cable-crunch', 'Crunch en polea', 'core', 'cable', ['Abdomen']);
  G('g-hanging-leg', 'Elevación de piernas colgado', 'core', 'bodyweight', ['Abdomen']);
  G('g-standing-calf', 'Gemelos de pie (multipower)', 'calf', 'barbell', ['Gemelos']);
  G('g-hip-thrust-machine', 'Hip thrust en máquina', 'hinge', 'plates', ['Glúteo'], ['Isquios']);
  G('g-prone-curl', 'Curl femoral tumbado', 'knee_flex', 'stack', ['Isquios']);
  G('g-standing-abductor', 'Abductor de pie', 'abduction', 'stack', ['Glúteo'], [], { unilateral: true });
  G('g-lat-pulldown', 'Jalón al pecho', 'pull_vertical', 'cable', ['Dorsal'], ['Bíceps', 'Espalda alta']);
  G('g-pec-deck', 'Pec deck', 'fly', 'stack', ['Pecho']);
  G('g-machine-shoulder', 'Press de hombro en máquina', 'press_vertical', 'stack', ['Hombro'], ['Tríceps']);
  G('g-db-rear-fly', 'Pájaros con mancuernas', 'rear_delt', 'dumbbell', ['Hombro posterior'], ['Espalda alta']);
  G('g-pendulum', 'Sentadilla péndulo', 'squat', 'plates', ['Cuádriceps'], ['Glúteo']);
  G('g-leg-press-45', 'Prensa inclinada 45°', 'squat', 'plates', ['Cuádriceps'], ['Glúteo', 'Aductores']);
  G('g-leg-ext-uni', 'Extensión de cuádriceps unilateral', 'knee_ext', 'stack', ['Cuádriceps'], [], { unilateral: true });
  G('g-step-up', 'Step-ups', 'squat', 'dumbbell', ['Cuádriceps', 'Glúteo'], [], { unilateral: true, compound: false });
  G('g-seated-calf', 'Elevación de talones sentado', 'calf', 'stack', ['Gemelos']);

  return list;
})();
