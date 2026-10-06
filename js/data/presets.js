// Rutinas predefinidas incluidas en la app (públicas: no poner aquí datos personales).
// Las rutinas personales se cargan desde un archivo .json con "Importar rutina".
//
// Formato (igual que el del archivo de importación, con format: 'gymlog-routine'):
// {
//   key: 'id-unico', version: 1, name: 'Nombre', goal: 'recomposicion', notes: '…',
//   profile: { goal, days, level, brands },   // se usa si la persona aún no tiene perfil
//   excluded: ['g-dips'],                      // ejercicios a evitar
//   settings: { 'hs-iso-bench': { mode: 'total', increment: 2.5 } },
//   days: [{ name, icon, exercises: [{ exId, sets, repMin, repMax, rir, rest, kg, note, superset }] }]
// }
// Sube "version" al cambiar una rutina: la app ofrecerá actualizarla conservando el historial.
const PRESETS = [];
