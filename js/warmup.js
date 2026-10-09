// Calentamiento y estiramientos guiados, según la zona que se entrena hoy.
// Calentamiento: general (subir temperatura) + movilidad dinámica y activación de lo que vas a usar;
// lo específico son las series de aproximación del primer básico. Nada de estiramientos estáticos largos antes.
// Al final, estiramientos estáticos suaves de ~30 s: flexibilidad y bajar pulsaciones (no evitan las agujetas).
// Sin apoyos sobre los codos ni flexión lumbar forzada (nada de tocar las puntas de pie).
const Prep = (() => {
  const S = (name, secs, cue, sides = false) => ({ name, secs, cue, sides });

  const CARDIO = S('Cardio suave', 120, 'Bici, elíptica, remo o cinta inclinada. A un ritmo en el que puedas hablar, hasta empezar a sudar.');
  const CAT = S('Gato-camello', 40, 'A cuatro patas, manos bajo los hombros. Redondea y arquea la espalda despacio, sin forzar la zona lumbar.');
  const BRIDGE = S('Puente de glúteo', 40, 'Boca arriba, rodillas dobladas. Sube la cadera apretando glúteos y aguanta 1 s arriba. Unas 12 reps.');
  const SWING = S('Balanceo de pierna', 25, 'De pie, con una mano en la pared. Balancea la pierna adelante y atrás, cada vez un poco más amplio.', true);
  const LUNGE = S('Zancada con rotación', 30, 'Zancada larga con las manos en el suelo, por dentro del pie adelantado. Gira el tronco y abre el brazo hacia el techo. 3–4 veces.', true);
  const SQUAT = S('Sentadilla con pausa', 40, 'Sin peso. Baja controlando y aguanta 2 s abajo, pecho alto y rodillas hacia fuera. Unas 8 reps.');
  const CIRCLES = S('Círculos de brazos', 30, 'Brazos estirados: círculos de pequeños a grandes, hacia delante y hacia atrás.');
  const TSPINE = S('Rotación torácica', 25, 'A cuatro patas, una mano en la nuca. Gira abriendo el codo hacia el techo y síguelo con la mirada.', true);
  const PULLAPART = S('Aperturas con goma', 40, 'Goma o polea con muy poco peso, brazos estirados al frente. Ábrelos juntando las escápulas. Unas 15 reps.');
  const EXTROT = S('Rotación externa', 30, 'Goma o polea ligera a la altura del codo, codo pegado al cuerpo. Gira el antebrazo hacia fuera, despacio. Unas 12 reps.', true);
  const SCAP = S('Flexión escapular', 40, 'En plancha alta (sobre las manos, no los antebrazos) o contra la pared. Brazos rectos: junta y separa las escápulas. 10 reps.');

  const HIPFLEX = S('Flexor de cadera', 30, 'Rodilla en el suelo (con algo blando debajo) y el otro pie delante. Aprieta el glúteo de atrás y lleva la cadera un poco adelante.', true);
  const HAMS = S('Isquios boca arriba', 30, 'Boca arriba, sube una pierna estirada con una toalla o goma en el pie. Sin tirar del cuello ni redondear la espalda.', true);
  const FIG4 = S('Glúteo en figura 4', 30, 'Boca arriba, tobillo sobre la rodilla contraria. Acerca las piernas al pecho hasta notar el glúteo.', true);
  const CALF = S('Gemelo en la pared', 30, 'Manos en la pared, una pierna atrás con el talón en el suelo y la rodilla estirada.', true);
  const CHEST = S('Pecho en la pared', 30, 'Brazo estirado a la altura del hombro, palma en la pared. Gira el cuerpo hacia el otro lado, suave.', true);
  const CHILD = S('Postura del niño', 45, 'De rodillas, siéntate sobre los talones y estira los brazos al frente con las palmas en el suelo. Nota la espalda y los dorsales.');
  const CROSS = S('Hombro posterior', 30, 'Cruza un brazo estirado por delante del pecho y acércalo con la otra mano, sin subir el hombro.', true);
  const BOOK = S('Libro abierto', 30, 'De lado, rodillas dobladas y brazos estirados al frente. Abre el brazo de arriba hacia el otro lado siguiéndolo con la mirada.', true);
  const BREATHE = S('Respiración', 60, 'Boca arriba, piernas sobre el banco. Inhala 4 s por la nariz y suelta el aire en 6 s. Baja pulsaciones.');

  const PLANS = {
    warm: {
      lower: [CARDIO, CAT, BRIDGE, SWING, LUNGE, SQUAT],
      upper: [CARDIO, CIRCLES, TSPINE, PULLAPART, EXTROT, SCAP],
      full: [CARDIO, CAT, LUNGE, BRIDGE, CIRCLES, PULLAPART, SQUAT],
    },
    cool: {
      lower: [HIPFLEX, HAMS, FIG4, CALF, BREATHE],
      upper: [CHEST, CHILD, CROSS, BOOK, BREATHE],
      full: [HIPFLEX, HAMS, FIG4, CHEST, CHILD, BREATHE],
    },
  };

  const KINDS = {
    warm: { icon: '🔥', title: 'Calentamiento', done: 'Calentamiento hecho',
      note: 'Sube la temperatura y prepara las articulaciones que vas a usar. Después, en el primer básico, tus series de aproximación. Sin estiramientos largos antes: más de 60 s seguidos pueden restar algo de fuerza.' },
    cool: { icon: '🧘', title: 'Estiramientos', done: 'Estiramientos hechos',
      note: 'Suaves, sin rebotes y respirando lento: tensión agradable, nunca dolor. No evitan las agujetas, pero con constancia mejoran tu flexibilidad y te ayudan a bajar revoluciones.' },
  };
  const REGION = { lower: 'tren inferior', upper: 'tren superior', full: 'cuerpo entero' };

  const plan = (kind, region) => PLANS[kind][region] || PLANS[kind].full;
  // Para el modo guiado: los ejercicios por lado se parten en dos tramos.
  const seq = items => items.flatMap((s, src) => s.sides
    ? ['izquierda', 'derecha'].map(side => ({ name: `${s.name} · ${side}`, secs: s.secs, src }))
    : [{ name: s.name, secs: s.secs, src }]);
  const mins = items => Math.round(seq(items).reduce((a, s) => a + s.secs, 0) / 60);

  return { KINDS, REGION, plan, seq, mins };
})();
