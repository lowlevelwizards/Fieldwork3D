import {readdirSync, readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

export const root = fileURLToPath(new URL('../../', import.meta.url));
export const coreFiles = [
  'verification/core-contracts.test.mjs',
  'verification/tooling.test.mjs',
  'breach-fixed-clock.test.mjs',
  'mission-restart-snapshot.test.mjs',
  'replay-r2-recording.test.mjs',
  'briefing-mission-facts.test.mjs',
  'operator-appearance-stage1.test.mjs',
  'campaign-03.test.mjs',
  'campaign-04.test.mjs',
  'equipment-01-catalog.test.mjs',
  'equipment-19-01-weapon-assemblies.test.mjs',
  'breach-spatial-index-performance.test.mjs',
  'pages-home.test.mjs',
];
const features = [
  ['worldgen', /^(worldgen|architecture|map-|asset-)/],
  ['operators', /^(operator|helmet|pasgt|r5-|r5i-|r6-|armor|baked|headwear)/],
  ['equipment', /^(equipment|weapon|faction)/],
  ['campaign', /^(campaign|lw-roster|lw-operations)/],
  ['replay', /^(replay|mission-restart|mission-favorite)/],
  ['briefing', /^briefing/],
  ['presentation', /^(texture|palette|visual|visibility|ux|pages|perf|camera|quick)/],
  ['simulation', /^(breach|awareness|attention|civilian|coupled|dnav|door|gameplay|lw-|mission|physicality|squad|tactical|transport|watch)/],
  ['audio', /^(sound|acoustic)/],
  ['environment', /^(actors-|art-study-|cloud-|condition5-|environment-|first-place-|grass-|ground-|hydraulic-|hydrology|interaction2-|natural-|rain-|render-architectural-|river-|solo-|standing-|terrain-|traffic-|transparent-|ui-operator-|valley-|vegetation-|water-|wind-|world-)/],
];
export const featureNames = [...features.map(([name]) => name), 'verification'];
export function testFiles() {
  const walk = dir => readdirSync(path.join(root, dir), {withFileTypes:true})
    .flatMap(e => e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`]);
  return walk('tests').filter(f => f.endsWith('.test.mjs')).sort();
}
export function featureFor(file) {
  if (file.startsWith('tests/verification/')) return 'verification';
  const base = path.basename(file);
  return features.find(([, pattern]) => pattern.test(base))?.[0] ?? 'unclassified';
}
export function filesFor(suite, selected = featureNames) {
  const all = testFiles();
  if (suite === 'core') return coreFiles.map(f => `tests/${f}`);
  if (suite === 'all' || suite === 'baseline') return all;
  if (suite !== 'feature') throw Error(`Unknown suite: ${suite}`);
  for (const name of selected) if (!featureNames.includes(name)) throw Error(`Unknown feature: ${name}`);
  return all.filter(f => selected.includes(featureFor(f)));
}
export function affectedFeatures(paths) {
  const chosen = new Set();
  for (const p of paths) {
    if (/^(docs\/|README\.md$)/.test(p)) continue;
    // Foundation changes have transitive effects throughout this application.
    if (/^src\/breach-(core|game|site|combat|intel|plan)\.ts$/.test(p) ||
        /^(package(-lock)?\.json|\.node-version|\.npmrc|tsconfig\.json|vite\.config\.ts|\.github\/|scripts\/verification\/)/.test(p))
      return [...featureNames];
    if (p.startsWith('tests/') && p.endsWith('.test.mjs')) {chosen.add(featureFor(p)); continue;}
    if (/^src\/worldgen\//.test(p) || /^src\/(map|asset)-/.test(p)) chosen.add('worldgen');
    else if (/^src\/(operator|faction-reference)/.test(p)) {chosen.add('operators');chosen.add('equipment');chosen.add('presentation');}
    else if (/^src\/(equipment|weapons\/)/.test(p)) {chosen.add('equipment');chosen.add('operators');chosen.add('campaign');chosen.add('simulation');chosen.add('replay');}
    else if (/^src\/campaign/.test(p)) {chosen.add('campaign');chosen.add('equipment');}
    else if (/^src\/breach-replay/.test(p)) {chosen.add('replay');chosen.add('simulation');chosen.add('presentation');}
    else if (/^src\/briefing\//.test(p)) {chosen.add('briefing');chosen.add('worldgen');chosen.add('simulation');}
    else if (/^src\/sound|^src\/breach-(audio|acoustics|combat-audio|live-sound)/.test(p)) chosen.add('audio');
    else if (/^src\/(ui|rendering)\/|\.html$|\.css$|^src\/breach-(3d|main|operator-rig)\.ts$/.test(p)) {chosen.add('presentation');chosen.add('operators');chosen.add('replay');chosen.add('simulation');chosen.add('equipment');}
    else if (/^src\/breach-/.test(p)) {chosen.add('simulation');chosen.add('replay');chosen.add('worldgen');}
    else return [...featureNames]; // Unknown code never silently receives less coverage.
  }
  return [...chosen].sort();
}
export function readBaseline() {
  return JSON.parse(readFileSync(path.join(root, 'tests/verification/known-failures.json'), 'utf8'));
}
