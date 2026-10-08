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
  mobility: 'Movilidad',
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

  // ---------- Peso libre, banco y sin material (ampliación) ----------
  // Pecho
  G('g-pushup', 'Flexiones', 'press_horizontal', 'bodyweight', ['Pecho'], ['Tríceps', 'Hombro']);
  G('g-incline-pushup', 'Flexiones inclinadas (manos en banco)', 'press_horizontal', 'bodyweight', ['Pecho'], ['Tríceps', 'Hombro']);
  G('g-db-bench', 'Press banca con mancuernas', 'press_horizontal', 'dumbbell', ['Pecho'], ['Tríceps', 'Hombro']);
  G('g-db-floor-press', 'Press en el suelo con mancuernas', 'press_horizontal', 'dumbbell', ['Pecho'], ['Tríceps']);
  G('g-db-squeeze', 'Press squeeze (mancuernas juntas)', 'press_horizontal', 'dumbbell', ['Pecho'], ['Tríceps'], { compound: false });
  G('g-db-fly', 'Aperturas con mancuernas en banco', 'fly', 'dumbbell', ['Pecho']);
  G('g-db-incline-fly', 'Aperturas inclinadas con mancuernas', 'fly', 'dumbbell', ['Pecho'], ['Hombro']);
  G('g-band-fly', 'Aperturas con goma', 'fly', 'band', ['Pecho']);
  // Hombro
  G('g-arnold', 'Press Arnold', 'press_vertical', 'dumbbell', ['Hombro'], ['Tríceps']);
  G('g-kb-press', 'Press de hombro con kettlebell a una mano', 'press_vertical', 'implement', ['Hombro'], ['Tríceps', 'Abdomen'], { unilateral: true });
  G('g-pike-pushup', 'Flexiones en pica', 'press_vertical', 'bodyweight', ['Hombro'], ['Tríceps']);
  G('g-db-front-raise', 'Elevaciones frontales con mancuernas', 'lateral_raise', 'dumbbell', ['Hombro']);
  G('g-lean-lateral', 'Elevación lateral inclinada a una mano', 'lateral_raise', 'dumbbell', ['Hombro'], [], { unilateral: true });
  G('g-band-lateral', 'Elevaciones laterales con goma', 'lateral_raise', 'band', ['Hombro']);
  G('g-band-pull-apart', 'Pull-apart con goma', 'rear_delt', 'band', ['Hombro posterior'], ['Espalda alta']);
  G('g-incline-y', 'Elevaciones en Y en banco inclinado', 'rear_delt', 'dumbbell', ['Hombro posterior'], ['Espalda alta']);
  G('g-band-face-pull', 'Face pull con goma', 'rear_delt', 'band', ['Hombro posterior'], ['Espalda alta']);
  // Espalda
  G('g-chest-supported-row', 'Remo con mancuernas apoyada en banco inclinado', 'row', 'dumbbell', ['Espalda alta'], ['Dorsal', 'Bíceps']);
  G('g-kb-row', 'Remo con kettlebell a una mano', 'row', 'implement', ['Dorsal'], ['Espalda alta', 'Bíceps'], { unilateral: true });
  G('g-renegade-row', 'Remo renegado (en plancha, con mancuernas)', 'row', 'dumbbell', ['Dorsal'], ['Abdomen', 'Espalda alta'], { unilateral: true });
  G('g-inverted-row', 'Remo invertido (multipower o TRX)', 'row', 'bodyweight', ['Espalda alta'], ['Dorsal', 'Bíceps']);
  G('g-band-row', 'Remo con goma', 'row', 'band', ['Espalda alta'], ['Dorsal', 'Bíceps']);
  G('g-band-pulldown', 'Jalón con goma', 'pull_vertical', 'band', ['Dorsal'], ['Bíceps']);
  G('g-assisted-pullup', 'Dominadas asistidas con goma', 'pull_vertical', 'band', ['Dorsal'], ['Bíceps', 'Espalda alta']);
  G('g-db-pullover', 'Pullover con mancuerna en banco', 'pull_vertical', 'dumbbell', ['Dorsal'], ['Pecho'], { compound: false });
  G('g-superman', 'Superman (extensión de espalda en el suelo)', 'hinge', 'bodyweight', ['Lumbar'], ['Glúteo'], { compound: false });
  // Brazos
  G('g-incline-db-curl', 'Curl inclinado en banco', 'biceps', 'dumbbell', ['Bíceps']);
  G('g-concentration-curl', 'Curl concentrado', 'biceps', 'dumbbell', ['Bíceps'], [], { unilateral: true });
  G('g-zottman', 'Curl Zottman', 'biceps', 'dumbbell', ['Bíceps']);
  G('g-band-curl', 'Curl con goma', 'biceps', 'band', ['Bíceps']);
  G('g-db-overhead-ext', 'Extensión de tríceps sobre la cabeza con mancuerna', 'triceps', 'dumbbell', ['Tríceps']);
  G('g-db-kickback', 'Patada de tríceps con mancuerna', 'triceps', 'dumbbell', ['Tríceps'], [], { unilateral: true });
  G('g-band-pushdown', 'Extensión de tríceps con goma', 'triceps', 'band', ['Tríceps']);
  // Pierna: dominante de rodilla
  G('g-air-squat', 'Sentadilla sin peso', 'squat', 'bodyweight', ['Cuádriceps', 'Glúteo'], [], { compound: false });
  G('g-goblet-squat', 'Sentadilla goblet (kettlebell o mancuerna)', 'squat', 'implement', ['Cuádriceps', 'Glúteo'], ['Aductores', 'Abdomen']);
  G('g-kb-sumo', 'Sentadilla sumo con kettlebell', 'squat', 'implement', ['Glúteo', 'Aductores'], ['Cuádriceps']);
  G('g-db-lunge', 'Zancadas con mancuernas', 'squat', 'dumbbell', ['Cuádriceps', 'Glúteo'], ['Aductores'], { unilateral: true });
  G('g-reverse-lunge', 'Zancada atrás', 'squat', 'dumbbell', ['Glúteo', 'Cuádriceps'], [], { unilateral: true });
  G('g-walking-lunge', 'Zancadas caminando', 'squat', 'dumbbell', ['Cuádriceps', 'Glúteo'], [], { unilateral: true });
  G('g-lateral-lunge', 'Zancada lateral', 'squat', 'dumbbell', ['Aductores', 'Glúteo'], ['Cuádriceps'], { unilateral: true });
  G('g-wall-sit', 'Sentadilla isométrica en la pared', 'knee_ext', 'hold', ['Cuádriceps'], ['Glúteo']);
  // Pierna: dominante de cadera y glúteo
  G('g-db-rdl', 'Peso muerto rumano con mancuernas', 'hinge', 'dumbbell', ['Isquios', 'Glúteo'], ['Lumbar']);
  G('g-kb-deadlift', 'Peso muerto con kettlebell', 'hinge', 'implement', ['Glúteo', 'Isquios'], ['Lumbar']);
  G('g-glute-bridge', 'Puente de glúteo', 'hinge', 'bodyweight', ['Glúteo'], ['Isquios'], { compound: false });
  G('g-sl-glute-bridge', 'Puente de glúteo a una pierna', 'hinge', 'bodyweight', ['Glúteo'], ['Isquios'], { compound: false, unilateral: true });
  G('g-db-hip-thrust', 'Hip thrust con mancuerna en banco', 'hinge', 'dumbbell', ['Glúteo'], ['Isquios'], { compound: false });
  G('g-frog-pump', 'Frog pumps', 'hinge', 'bodyweight', ['Glúteo'], [], { compound: false });
  G('g-donkey-kick', 'Patada de glúteo en cuadrupedia', 'hinge', 'band', ['Glúteo'], [], { compound: false, unilateral: true });
  G('g-fire-hydrant', 'Fire hydrant (abducción en cuadrupedia)', 'abduction', 'bodyweight', ['Glúteo'], [], { unilateral: true });
  G('g-clamshell', 'Almeja con goma (clamshell)', 'abduction', 'band', ['Glúteo'], [], { unilateral: true });
  G('g-side-lying-abd', 'Abducción tumbada de lado', 'abduction', 'bodyweight', ['Glúteo'], [], { unilateral: true });
  G('g-copenhagen', 'Plancha Copenhague (sobre mano)', 'adduction', 'hold', ['Aductores'], ['Abdomen'], { unilateral: true });
  G('g-nordic', 'Curl nórdico', 'knee_flex', 'bodyweight', ['Isquios']);
  G('g-ball-curl', 'Curl femoral con fitball', 'knee_flex', 'bodyweight', ['Isquios'], ['Glúteo']);
  G('g-db-calf', 'Gemelos de pie con mancuernas', 'calf', 'dumbbell', ['Gemelos']);
  G('g-sl-calf', 'Gemelos a una pierna en escalón', 'calf', 'bodyweight', ['Gemelos'], [], { unilateral: true });
  // Core
  G('g-crunch', 'Crunch en el suelo', 'core', 'bodyweight', ['Abdomen']);
  G('g-situp', 'Sit-ups', 'core', 'bodyweight', ['Abdomen']);
  G('g-weighted-situp', 'Sit-ups con kettlebell o mancuerna', 'core', 'implement', ['Abdomen']);
  G('g-decline-situp', 'Sit-ups en banco declinado', 'core', 'bodyweight', ['Abdomen']);
  G('g-reverse-crunch', 'Crunch inverso', 'core', 'bodyweight', ['Abdomen']);
  G('g-bench-leg-raise', 'Elevación de piernas tumbada en banco', 'core', 'bodyweight', ['Abdomen']);
  G('g-v-up', 'V-ups', 'core', 'bodyweight', ['Abdomen']);
  G('g-bicycle', 'Bicicleta (crunch cruzado)', 'core', 'bodyweight', ['Abdomen']);
  G('g-heel-touch', 'Toques de talón (oblicuos)', 'core', 'bodyweight', ['Abdomen']);
  G('g-flutter', 'Patadas de tijera', 'core', 'bodyweight', ['Abdomen']);
  G('g-hollow', 'Hollow hold', 'core', 'hold', ['Abdomen']);
  G('g-russian-twist', 'Russian twist (con disco, mancuerna o kettlebell)', 'core', 'implement', ['Abdomen']);
  G('g-kb-side-bend', 'Inclinación lateral con kettlebell', 'core', 'implement', ['Abdomen'], [], { unilateral: true });
  G('g-db-side-bend', 'Inclinación lateral con mancuerna', 'core', 'dumbbell', ['Abdomen'], [], { unilateral: true });
  G('g-kb-windmill', 'Molino con kettlebell (windmill)', 'core', 'implement', ['Abdomen'], ['Hombro', 'Isquios'], { unilateral: true });
  G('g-cable-woodchop', 'Leñador en polea', 'core', 'cable', ['Abdomen'], [], { unilateral: true });
  G('g-db-woodchop', 'Leñador con mancuerna', 'core', 'dumbbell', ['Abdomen'], [], { unilateral: true });
  G('g-suitcase-carry', 'Paseo a una mano (suitcase carry)', 'core', 'implement', ['Abdomen'], ['Espalda alta'], { unilateral: true });
  G('g-farmer-carry', 'Paseo del granjero', 'core', 'dumbbell', ['Abdomen'], ['Espalda alta']);
  G('g-ab-wheel', 'Rueda abdominal', 'core', 'bodyweight', ['Abdomen'], ['Dorsal']);
  G('g-shoulder-tap', 'Plancha con toques de hombro', 'core', 'bodyweight', ['Abdomen'], ['Hombro']);
  G('g-side-plank-dip', 'Plancha lateral con elevación de cadera (sobre mano)', 'core', 'bodyweight', ['Abdomen'], ['Glúteo'], { unilateral: true });
  G('g-stir-pot', 'Remover la olla en fitball (sobre manos)', 'core', 'bodyweight', ['Abdomen']);
  // Potencia y equilibrio
  G('g-broad-jump', 'Salto horizontal', 'power', 'bodyweight', ['Glúteo', 'Cuádriceps']);
  G('g-split-jump', 'Zancada con salto', 'power', 'bodyweight', ['Cuádriceps', 'Glúteo'], [], { unilateral: true });
  G('g-db-snatch', 'Arrancada con mancuerna a una mano', 'power', 'dumbbell', ['Glúteo', 'Hombro'], ['Isquios', 'Espalda alta'], { unilateral: true });
  G('g-kb-sl-swing', 'Swing con kettlebell a una mano', 'power', 'implement', ['Glúteo', 'Isquios'], ['Abdomen'], { unilateral: true });
  G('g-med-ball-slam', 'Slam con balón medicinal', 'power', 'implement', ['Abdomen', 'Dorsal'], ['Hombro']);
  G('g-med-ball-rot', 'Lanzamiento rotacional de balón a la pared', 'power', 'implement', ['Abdomen'], ['Hombro'], { unilateral: true });
  G('g-sl-box-squat', 'Sentadilla a una pierna al banco', 'balance', 'bodyweight', ['Cuádriceps', 'Glúteo'], [], { unilateral: true });
  G('g-sl-stand', 'Equilibrio a una pierna con ojos cerrados', 'balance', 'hold', ['Gemelos'], ['Glúteo'], { unilateral: true });
  G('g-kb-sl-rdl', 'Peso muerto a una pierna con kettlebell', 'balance', 'implement', ['Isquios', 'Glúteo'], [], { unilateral: true });
  // Cardio
  G('g-burpee', 'Burpees', 'cardio', 'bodyweight', ['Cuádriceps'], ['Pecho']);
  G('g-high-knees', 'Skipping (rodillas arriba)', 'cardio', 'bodyweight', ['Cuádriceps']);
  G('g-jump-rope', 'Comba', 'cardio', 'bodyweight', ['Gemelos']);
  // Movilidad
  G('g-worlds-greatest', 'El mejor estiramiento del mundo', 'mobility', 'bodyweight', ['Glúteo'], ['Espalda alta'], { unilateral: true });
  G('g-cat-cow', 'Gato-camello', 'mobility', 'bodyweight', ['Lumbar']);
  G('g-90-90', 'Rotaciones de cadera 90/90', 'mobility', 'bodyweight', ['Glúteo']);
  G('g-thoracic-rot', 'Rotación torácica en cuadrupedia', 'mobility', 'bodyweight', ['Espalda alta'], [], { unilateral: true });
  G('g-hip-flexor', 'Estiramiento de flexor de cadera (rodilla en el suelo)', 'mobility', 'hold', ['Cuádriceps'], [], { unilateral: true });
  G('g-cossack', 'Sentadilla cosaca', 'mobility', 'bodyweight', ['Aductores'], ['Cuádriceps', 'Glúteo'], { unilateral: true });
  G('g-deep-squat', 'Sentadilla profunda mantenida', 'mobility', 'hold', ['Glúteo'], ['Aductores']);
  G('g-band-dislocate', 'Dislocaciones de hombro con goma', 'mobility', 'band', ['Hombro']);
  G('g-hamstring-flow', 'Bisagra con alcance (movilidad de isquios)', 'mobility', 'bodyweight', ['Isquios']);

  // Con apoyo de codos o carga en el codo flexionado (cada perfil puede marcarlos como ⛔ Evitar)
  G('g-bench-dips', 'Fondos en banco', 'triceps', 'bodyweight', ['Tríceps'], ['Pecho', 'Hombro']);
  G('g-machine-dip', 'Fondos en máquina', 'triceps', 'stack', ['Tríceps'], ['Pecho']);
  G('g-diamond-pushup', 'Flexiones diamante', 'triceps', 'bodyweight', ['Tríceps'], ['Pecho']);
  G('g-close-pushup', 'Flexiones cerradas', 'press_horizontal', 'bodyweight', ['Pecho', 'Tríceps'], ['Hombro']);
  G('g-db-skull', 'Press francés con mancuernas', 'triceps', 'dumbbell', ['Tríceps']);
  G('g-ez-skull', 'Press francés con barra Z', 'triceps', 'barbell', ['Tríceps']);
  G('g-side-plank', 'Plancha lateral sobre antebrazo', 'core', 'hold', ['Abdomen'], [], { unilateral: true });
  G('g-rkc-plank', 'Plancha RKC (antebrazos, máxima tensión)', 'core', 'hold', ['Abdomen'], ['Glúteo']);
  G('g-plank-saw', 'Plancha con balanceo (plank saw)', 'core', 'bodyweight', ['Abdomen']);
  G('g-plank-updown', 'Plancha arriba-abajo (antebrazos a manos)', 'core', 'bodyweight', ['Abdomen'], ['Tríceps', 'Hombro']);
  G('g-captain-chair', 'Elevación de rodillas en silla romana', 'core', 'bodyweight', ['Abdomen']);
  G('g-copenhagen-elbow', 'Plancha Copenhague sobre antebrazo', 'adduction', 'hold', ['Aductores'], ['Abdomen'], { unilateral: true });

  // ---------- Animal Flow ----------
  // Cuadrupedias y transiciones: fuerza, potencia y movilidad sin material. Apoyo en manos, nunca en codos.
  const AF = (...a) => add('Genérico', 'Animal Flow', ...a);
  AF('af-beast-hold', 'Beast hold (rodillas suspendidas)', 'core', 'hold', ['Abdomen'], ['Hombro']);
  AF('af-traveling-beast', 'Beast caminando (traveling beast)', 'core', 'bodyweight', ['Abdomen'], ['Hombro', 'Cuádriceps']);
  AF('af-crab-hold', 'Crab hold (cangrejo estático)', 'core', 'hold', ['Glúteo'], ['Tríceps', 'Hombro posterior']);
  AF('af-side-kick', 'Side kick-through', 'core', 'bodyweight', ['Abdomen'], ['Hombro'], { unilateral: true });
  AF('af-underswitch', 'Underswitch', 'mobility', 'bodyweight', ['Abdomen'], ['Glúteo'], { unilateral: true });
  AF('af-loaded-beast', 'Loaded beast (balanceo adelante-atrás)', 'mobility', 'bodyweight', ['Hombro'], ['Cuádriceps']);
  AF('af-crab-reach', 'Crab reach (alcance desde cangrejo)', 'mobility', 'bodyweight', ['Glúteo'], ['Hombro', 'Espalda alta'], { unilateral: true });
  AF('af-scorpion', 'Scorpion reach', 'mobility', 'bodyweight', ['Glúteo'], ['Abdomen'], { unilateral: true });
  AF('af-ape-reach', 'Ape reach (sentadilla profunda con alcance)', 'mobility', 'bodyweight', ['Aductores'], ['Glúteo']);
  AF('af-wrist-prep', 'Movilidad de muñecas', 'mobility', 'bodyweight', ['Hombro']);
  AF('af-traveling-ape', 'Ape lateral (traveling ape)', 'power', 'bodyweight', ['Cuádriceps', 'Glúteo'], ['Hombro']);
  AF('af-frogger', 'Frogger (salto de rana)', 'power', 'bodyweight', ['Glúteo', 'Cuádriceps'], ['Aductores']);
  AF('af-lateral-beast', 'Beast lateral (traveling beast de lado)', 'cardio', 'bodyweight', ['Abdomen'], ['Hombro']);

  return list;
})();
