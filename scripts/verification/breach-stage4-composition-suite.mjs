/** Stage 4 focused gate: presentation listeners, input, replay/mission
 * ownership and existing UX regressions. No background work or browser needed.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const tests=[
 'tests/breach-roadmap2-stage4-replay-hud.test.mjs',
 'tests/breach-roadmap2-stage4-pointer-feedback.test.mjs',
 'tests/breach-canvas-gestures.test.mjs',
 'tests/breach-touch-recovery.test.mjs',
 'tests/ux2-pointer-hit-targets.test.mjs',
 'tests/interaction2-core.test.mjs',
 'tests/ux2-order-previews.test.mjs',
 'tests/replay-timeline-controller-step5.test.mjs',
 'tests/replay-library-controller-step4.test.mjs',
 'tests/breach-mission-controller-step8.test.mjs',
 'tests/breach-runtime-loop-step12.test.mjs',
 'tests/tactical-hud-palette-controller-step7.test.mjs',
 'tests/breach-audio-controller-step6.test.mjs'
];
for(const file of tests)if(!existsSync(file))
 throw Error('Stage 4 missing regression: '+file);
const result=spawnSync(process.execPath,
 ['--experimental-strip-types','--test',...tests],
 {stdio:'inherit',env:process.env});
if(result.error)throw result.error;
process.exit(result.status??1);
