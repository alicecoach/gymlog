// Persistencia en localStorage (los datos viven en el móvil).
// Varios usuarios por dispositivo: cada uno con sus rutinas, historial y ajustes.
const Store = (() => {
  const USERS_KEY = 'gymlog.users';
  const LEGACY_KEY = 'gymlog.v1';
  const dataKey = id => `gymlog.u.${id}`;
  const defaults = () => ({
    version: 1,
    settings: { restDefault: 120, bodyweight: '', sex: '', age: '', height: '' },
    profile: null,            // { goal, days, level, brands, excluded }
    routines: [],             // { id, name, goal, notes, days:[{ name, icon, exercises:[{ exId, sets, repMin, repMax, rir, rest, kg, note, superset }] }] }
    activeRoutineId: null,
    workouts: [],             // entrenos terminados
    activeWorkout: null,      // entreno en curso
    customExercises: [],
    exerciseSettings: {},     // { [exId]: { mode, increment } }
    photos: {},               // { [exId]: dataURL }
    presetsLoaded: [],        // claves de PRESETS ya cargadas
  });
  let users = null;           // { current, list: [{ id, name, avatar }] }
  let state = null;

  const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const write = (k, v) => {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { alert('No se pudo guardar: el almacenamiento está lleno. Borra alguna foto o exporta tus datos.'); return false; }
  };

  function loadUsers() {
    users = read(USERS_KEY) || { current: null, list: [] };
    // Migración: los datos de la versión de un solo usuario pasan a ser el primer perfil.
    const legacy = read(LEGACY_KEY);
    if (legacy && !users.list.length) {
      const u = { id: uid(), name: 'Yo', avatar: '🏋️' };
      users = { current: u.id, list: [u] };
      write(dataKey(u.id), legacy);
      write(USERS_KEY, users);
      localStorage.removeItem(LEGACY_KEY);
    }
    return users;
  }
  const getUsers = () => users || loadUsers();
  const currentUser = () => getUsers().list.find(u => u.id === getUsers().current) || null;

  function load() {
    const u = currentUser();
    state = Object.assign(defaults(), (u && read(dataKey(u.id))) || {});
    state.settings = Object.assign(defaults().settings, state.settings);
    return state;
  }
  function get() { return state || load(); }
  function save() {
    const u = currentUser();
    return u ? write(dataKey(u.id), get()) : true;   // sin usuario (pruebas): solo en memoria
  }

  function addUser(name, avatar = '🏋️') {
    const u = { id: uid(), name: name.trim() || 'Sin nombre', avatar };
    getUsers().list.push(u);
    users.current = u.id;
    write(USERS_KEY, users);
    state = defaults();
    save();
    return u;
  }
  function switchUser(id) {
    if (!getUsers().list.some(u => u.id === id)) return;
    users.current = id;
    write(USERS_KEY, users);
    state = null;
    load();
  }
  function updateUser(id, patch) {
    Object.assign(getUsers().list.find(u => u.id === id), patch);
    write(USERS_KEY, users);
  }
  function deleteUser(id) {
    users.list = getUsers().list.filter(u => u.id !== id);
    localStorage.removeItem(dataKey(id));
    if (users.current === id) users.current = users.list[0]?.id || null;
    write(USERS_KEY, users);
    state = null;
    load();
  }

  const allExercises = () => MACHINES.concat(get().customExercises);
  const exercise = id => allExercises().find(e => e.id === id) ||
    { id, name: 'Ejercicio eliminado', brand: '', line: '', pattern: 'core', load: 'stack', primary: [], secondary: [] };

  // Cómo se anota el peso y cuánto se sube cada vez, según el tipo de carga.
  const MODES = { total: 'kg', lado: 'kg/lado', mancuerna: 'kg/manc.', lastre: '+kg' };
  function defaultLoad(ex) {
    switch (ex.load) {
      case 'plates': return { mode: 'lado', increment: 2.5 };
      case 'stack': return { mode: 'total', increment: 5 };
      case 'dumbbell': return { mode: 'mancuerna', increment: 2 };
      case 'bodyweight': return { mode: 'lastre', increment: 2.5 };
      case 'implement': return { mode: 'total', increment: 4 };
      default: return { mode: 'total', increment: 2.5 };
    }
  }
  function exSettings(id) {
    const s = Object.assign(defaultLoad(exercise(id)), get().exerciseSettings[id] || {});
    s.label = MODES[s.mode] || 'kg';
    return s;
  }
  function setExSettings(id, patch) {
    get().exerciseSettings[id] = Object.assign({}, get().exerciseSettings[id], patch);
    save();
  }
  function toggleExcluded(id) {
    const s = get();
    s.profile = s.profile || { goal: 'recomposicion', days: 4, level: 'intermedio', brands: ['Hammer Strength', 'Genérico'] };
    const ex = s.profile.excluded || [];
    s.profile.excluded = ex.includes(id) ? ex.filter(x => x !== id) : ex.concat(id);
    save();
  }

  function exportJSON() { return JSON.stringify(get(), null, 2); }
  function importJSON(text) {
    const data = JSON.parse(text);
    if (!data || !Array.isArray(data.workouts)) throw new Error('Archivo no válido');
    state = Object.assign(defaults(), data);
    save();
  }
  function reset() { state = defaults(); save(); }

  // Añade una rutina predefinida (copia editable) y sus ajustes de carga.
  const presetCopy = p => JSON.parse(JSON.stringify({ name: p.name, goal: p.goal, notes: p.notes, days: p.days }));
  function applyPresetSettings(p, overwrite) {
    const s = get();
    Object.entries(p.settings || {}).forEach(([id, st]) => {
      s.exerciseSettings[id] = overwrite ? Object.assign({}, s.exerciseSettings[id], st) : Object.assign({}, st, s.exerciseSettings[id]);
    });
    // Lo que la persona ya eligió (objetivo, días…) manda; la rutina completa lo que falte (material).
    if (p.profile) s.profile = Object.assign({}, p.profile, s.profile);
    if (s.profile && p.excluded) s.profile.excluded = [...new Set([...(s.profile.excluded || []), ...p.excluded])];
  }
  function addPreset(p) {
    const s = get();
    const r = Object.assign(presetCopy(p), { id: uid(), presetKey: p.key, presetVersion: p.version || 1, createdAt: Date.now() });
    s.routines.push(r);
    if (!s.presetsLoaded.includes(p.key)) s.presetsLoaded.push(p.key);
    if (!s.activeRoutineId) s.activeRoutineId = r.id;
    applyPresetSettings(p, false);
    save();
    return r;
  }
  // Sustituye una rutina predefinida por su versión nueva. Mantiene el id para no perder el historial.
  function updatePreset(routineId, pack) {
    const r = get().routines.find(x => x.id === routineId);
    const p = pack || PRESETS.find(x => x.key === r.presetKey);
    const fresh = presetCopy(p);
    Object.assign(r, { notes: fresh.notes, days: fresh.days, presetVersion: p.version || 1 });
    applyPresetSettings(p, true);
    save();
  }
  const outdatedPreset = r => {
    const p = r.presetKey && typeof PRESETS !== 'undefined' && PRESETS.find(x => x.key === r.presetKey);
    return p && (r.presetVersion || 1) < (p.version || 1) ? p : null;
  };
  // Importa una rutina desde archivo. Si ya existe (misma key) y el archivo es más nuevo, la actualiza.
  function importRoutinePack(pack) {
    if (!pack || pack.format !== 'gymlog-routine' || !pack.key || !Array.isArray(pack.days)) throw new Error('No es un archivo de rutina de GymLog');
    const unknown = pack.days.flatMap(d => d.exercises.map(x => x.exId)).filter(id => !allExercises().some(e => e.id === id));
    if (unknown.length) throw new Error('Ejercicios desconocidos: ' + unknown.join(', '));
    const existing = get().routines.find(r => r.presetKey === pack.key);
    if (!existing) return { status: 'added', routine: addPreset(pack) };
    if ((pack.version || 1) > (existing.presetVersion || 1)) { updatePreset(existing.id, pack); return { status: 'updated', routine: existing }; }
    return { status: 'same', routine: existing };
  }
  // Exporta una rutina como archivo para compartirla (sin historial ni datos personales).
  function exportRoutinePack(r) {
    const ids = new Set(r.days.flatMap(d => d.exercises.map(x => x.exId)));
    const settings = Object.fromEntries(Object.entries(get().exerciseSettings).filter(([id]) => ids.has(id)));
    return { format: 'gymlog-routine', key: r.presetKey || r.id, version: r.presetVersion || 1, name: r.name, goal: r.goal,
      notes: r.notes || '', settings, days: r.days };
  }
  // Completa datos de versiones anteriores (iconos de día).
  function migrate() {
    get().routines.forEach(r => r.days.forEach(d => { if (!d.icon) d.icon = Icons.dayIconFor(d.name); }));
    save();
  }

  return { get, save, uid, allExercises, exercise, exSettings, setExSettings, toggleExcluded, MODES, exportJSON, importJSON, reset,
    addPreset, updatePreset, outdatedPreset, importRoutinePack, exportRoutinePack, migrate, getUsers, currentUser, addUser, switchUser, updateUser, deleteUser };
})();
