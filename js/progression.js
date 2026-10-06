// Doble progresión con RIR:
// 1) Con el mismo peso, suma repeticiones hasta llegar al tope del rango en todas las series.
// 2) Entonces sube el peso (el incremento de esa máquina) y vuelve al mínimo del rango.
// 3) Si te sobran muchas repeticiones (RIR muy alto), sube antes.
// 4) Si llevas 3 sesiones sin progresar, o 2 por debajo del rango, baja algo de peso y reconstruye.
const Progression = (() => {
  const num = v => (v === '' || v == null ? null : Number(v));
  const round = x => Math.round(x * 100) / 100;
  const topWeight = sets => Math.max(...sets.map(s => num(s.kg) || 0));
  const workSets = sets => { const t = topWeight(sets); return sets.filter(s => (num(s.kg) || 0) === t); };
  const totalReps = sets => workSets(sets).reduce((a, s) => a + num(s.reps), 0);
  const e1rm = (kg, reps, rir) => kg * (1 + (reps + (num(rir) || 0)) / 30);

  // Sesiones anteriores de un ejercicio, de la más reciente a la más antigua.
  function historyFor(exId) {
    // Las descargas y los HIIT no cuentan para la progresión.
    return Store.get().workouts.filter(w => !['descarga', 'hiit'].includes(w.type)).sort((a, b) => b.start - a.start)
      .map(w => {
        const e = w.exercises.find(x => x.exId === exId);
        if (!e) return null;
        const sets = e.sets.filter(s => s.done && num(s.reps) > 0);
        return sets.length ? { date: w.start, workoutId: w.id, sets, target: e.target } : null;
      })
      .filter(Boolean);
  }

  function bestE1rm(sets) { return Math.max(0, ...sets.map(s => e1rm(num(s.kg) || 0, num(s.reps), s.rir))); }

  function suggest(exId, target) {
    const hist = historyFor(exId);
    const { increment, label } = Store.exSettings(exId);
    const f = kg => `${Number(kg).toLocaleString('es-ES')} ${label}`;
    if (!hist.length) {
      return { type: 'first', kg: null, reps: target.repMin,
        msg: `Primera vez: busca un peso con el que hagas ${target.repMin}–${target.repMax} reps dejando ${target.rir} en reserva.` };
    }
    const last = hist[0];
    const w = topWeight(last.sets);
    const ws = workSets(last.sets);
    const rirs = ws.map(s => num(s.rir)).filter(r => r != null);

    const allTop = ws.length >= target.sets && ws.every(s => num(s.reps) >= target.repMax);
    const tooEasy = rirs.length === ws.length && rirs.length > 0 && rirs.every(r => r >= target.rir + 3)
      && ws.every(s => num(s.reps) >= target.repMin);
    if (allTop || tooEasy) {
      const steps = num(ws[0].reps) >= target.repMax + 3 ? 2 : 1;
      const kg = round(w + increment * steps);
      return { type: 'up', kg, reps: target.repMin,
        msg: allTop
          ? `Llegaste a ${target.repMax} reps en todas las series. ¡Sube a ${f(kg)}!`
          : `Te sobraron muchas reps (RIR ${Math.min(...rirs)}+). ¡Sube a ${f(kg)}!` };
    }

    const prev = hist[1];
    const below = ws.some(s => num(s.reps) < target.repMin);
    const justUp = prev && topWeight(prev.sets) < w;

    const same = hist.slice(0, 3);
    if (same.length === 3 && same.every(h => topWeight(h.sets) === w) && totalReps(same[0].sets) <= totalReps(same[2].sets)) {
      const kg = round(Math.max(0, w - increment));
      return { type: 'stall', kg, reps: target.repMin,
        msg: `3 sesiones sin progresar con ${f(w)}. Baja a ${f(kg)} y reconstruye; revisa sueño, descanso y comida.` };
    }
    if (below && prev && !justUp && topWeight(prev.sets) === w && workSets(prev.sets).some(s => num(s.reps) < target.repMin)) {
      const kg = round(Math.max(0, w - increment));
      return { type: 'down', kg, reps: target.repMin,
        msg: `Dos sesiones por debajo de ${target.repMin} reps. Baja a ${f(kg)} para trabajar en rango.` };
    }
    if (below && justUp) {
      return { type: 'keep', kg: w, reps: target.repMin,
        msg: `Acabas de subir de peso: mantén ${f(w)} hasta llegar a ${target.repMin} reps en todas las series.` };
    }
    const minReps = Math.min(...ws.map(s => num(s.reps)));
    return { type: 'keep', kg: w, reps: Math.min(target.repMax, minReps + 1),
      msg: `Mantén ${f(w)} e intenta sumar 1 rep por serie (meta: ${target.repMax}).` };
  }

  return { historyFor, suggest, bestE1rm, e1rm, topWeight };
})();
