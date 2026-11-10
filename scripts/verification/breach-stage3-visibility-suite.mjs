/** Stage 3 exhaustive focused regression gate, deliberately PR-only.
 * Keep the normal curated critical suite fast for unrelated architecture work.
 * This runs the existing camera, window, portal, fog and replay regressions.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const tests=[
 'tests/visibility-01-cache.test.mjs',
 'tests/visibility-02-footprint.test.mjs',
 'tests/visibility-03-optics.test.mjs',
 'tests/visibility-04-surface.test.mjs',
 'tests/visibility-05-fog-canopy.test.mjs',
 'tests/visibility-07-cutaway.test.mjs',
 'tests/visibility-08-closed-door-seals.test.mjs',
 'tests/visibility-10-architectural-fog.test.mjs',
 'tests/visibility-11-fog-domain.test.mjs',
 'tests/visibility-12-micro-cache.test.mjs',
 'tests/fog-contour-smoothing.test.mjs',
 'tests/fog-interior-occlusion-regression.test.mjs',
 'tests/fog-exterior-facade-regression.test.mjs',
 'tests/fog-exterior-unseen-apertures-regression.test.mjs',
 'tests/fog-physical-depth-regression.test.mjs',
 'tests/presentation-detail-keys-and-door-sight-p7.test.mjs',
 'tests/presentation-knowledge-only-p7.test.mjs',
 'tests/replay-r2-recording.test.mjs',
 'tests/replay-r42-operator-sight.test.mjs',
 'tests/replay-r42c-civilian-sight.test.mjs',
 'tests/replay-r42c-door-knowledge.test.mjs',
 'tests/replay-r43-personal-visibility.test.mjs',
 'tests/replay-r43b-window-knowledge.test.mjs',
 'tests/civilian-c6-historical-visibility.test.mjs',
 'tests/replay-knowledge-controller-20261109.test.mjs',
 'tests/breach-roadmap2-stage3-knowledge.test.mjs',
 'tests/breach-roadmap2-stage3-integration.test.mjs'
];
for(const file of tests)if(!existsSync(file))
 throw Error('Stage 3 regression missing: '+file);
const result=spawnSync(process.execPath,
 ['--experimental-strip-types','--test',...tests],
 {stdio:'inherit',env:process.env});
if(result.error)throw result.error;
process.exit(result.status??1);
