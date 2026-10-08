// Ilustraciones de técnica (posición inicial y final) de Everkinetic, CC BY-SA 4.0:
// https://github.com/everkinetic/data · Copias sin modificar en img/ek/<id>-a.png y -b.png.
// Solo se enlazan cuando el dibujo enseña el mismo movimiento; las máquinas usan el de su equivalente genérico.
const DEMOS = (() => {
  const map = {
    '0066': ['hs-iso-bench', 'hss-chest-press', 'mts-iso-chest', 'mu-conv-chest', 'mm-chest-press', 'hs-iso-wide-chest'],
    '0043': ['hs-iso-incline', 'mts-iso-incline', 'mm-incline-press'],
    '0085': ['hs-iso-decline', 'mm-decline-press'],
    '0042': ['g-bench'], '0061': ['g-db-incline'], '0081': ['g-smith-incline'], '0055': ['g-db-bench'],
    '0054': ['g-dips'], '0048': ['g-cable-fly'],
    '0056': ['g-db-fly'], '0062': ['g-db-incline-fly'], '0050': ['g-band-fly'],
    '0077': ['g-pushup'], '0188': ['g-close-pushup', 'g-diamond-pushup'],
    '0038': ['g-kb-press'], '0033': ['g-db-front-raise'], '0018': ['g-db-lateral'],
    '0032': ['g-db-rear-fly'], '0020': ['g-band-pull-apart'],
    '0095': ['hs-iso-front-pulldown', 'hs-iso-wide-pulldown', 'hss-lat-pulldown', 'mts-front-pulldown', 'mu-div-pulldown', 'mm-lat-pulldown', 'mm-front-pulldown', 'g-lat-pulldown'],
    '0087': ['g-pullup', 'g-assisted-pullup'],
    '0025': ['g-cable-row', 'hss-seated-row', 'mu-div-row', 'mm-row', 'hs-iso-row', 'mts-iso-row', 'hs-iso-low-row', 'mm-low-row', 'hs-dy-row'],
    '0086': ['g-inverted-row'], '0079': ['g-db-pullover'], '0105': ['g-superman'], '0103': ['hss-back-ext', 'mu-back-ext'],
    '0253': ['hss-biceps', 'mts-biceps', 'mu-biceps'], '0224': ['g-db-curl'], '0212': ['g-cable-curl'], '0227': ['g-hammer-curl'],
    '0214': ['g-incline-db-curl'], '0220': ['g-concentration-curl'], '0251': ['g-zottman'], '0261': ['g-band-curl'],
    '0210': ['hss-triceps', 'mts-triceps', 'mu-triceps'], '0205': ['g-pushdown'], '0192': ['g-db-overhead-ext'], '0204': ['g-db-kickback'],
    '0162': ['g-bench-dips'], '0171': ['g-machine-dip'], '0184': ['g-db-skull'], '0183': ['g-ez-skull'],
    '0127': ['hs-iso-leg-press', 'hs-linear-leg-press', 'hss-leg-press', 'mu-leg-press', 'mm-leg-press', 'g-leg-press-45'],
    '0123': ['hs-linear-hack', 'mm-hack-squat'],
    '0122': ['g-squat'], '0124': ['g-smith-squat'],
    '0152': ['g-kb-sumo'], '0137': ['g-step-up'],
    '0142': ['hs-iso-leg-ext', 'hss-leg-ext', 'mu-leg-ext', 'mm-leg-ext', 'g-leg-ext-uni'],
    '0117': ['hss-prone-curl', 'mu-prone-curl', 'g-prone-curl', 'mm-leg-curl'], '0119': ['hss-seated-curl', 'mu-seated-curl'],
    '0156': ['hss-hip-abduction', 'mu-abductor'], '0157': ['hss-hip-adduction', 'mu-adductor'],
    '0118': ['g-rdl'], '0107': ['g-db-rdl'], '0109': ['g-glute-bridge', 'g-sl-glute-bridge'],
    '0279': ['hs-seated-calf', 'mm-seated-calf', 'g-seated-calf'], '0273': ['mu-calf'], '0282': ['mm-standing-calf'],
    '0281': ['g-standing-calf'],
    '0291': ['g-crunch'], '0284': ['g-bicycle'], '0116': ['g-flutter'], '0021': ['g-bench-leg-raise'], '0287': ['g-reverse-crunch'],
    '0292': ['g-decline-situp'], '0113': ['g-side-plank'], '0294': ['g-db-side-bend', 'g-kb-side-bend'], '0286': ['g-ab-wheel'],
  };
  const out = {};
  Object.entries(map).forEach(([ek, ids]) => ids.forEach(id => { out[id] = ek; }));
  return out;
})();
