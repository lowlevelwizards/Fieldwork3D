/** Stage 7 independent movement, physical passage, traversal and replay
 * regression matrix. The fast architecture gate separately freezes Stage 1
 * outcomes and performs the critical 60 Hz scenario contracts.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const tests=[
 "tests/breach-roadmap2-stage7-motor.test.mjs",
 "tests/breach-roadmap2-stage1-soak.test.mjs",
 "tests/doorway-right-of-way-session.test.mjs",
 "tests/doorway-right-of-way.test.mjs",
 "tests/breach-physical-interactions-nov8.test.mjs",
 "tests/breach-traversal-recovery.test.mjs",
 "tests/breach-mantle-session.test.mjs",
 "tests/breach-wall-glide-here-window.test.mjs",
 "tests/dnav-r6-movement-quality.test.mjs",
 "tests/tactical-integration-01-recovery.test.mjs",
 "tests/breach-roadmap2-door-pressure.test.mjs",
 "tests/breach-roadmap3-locomotion-clearance.test.mjs",
 "tests/sim-frame-origin-proposal-p9.test.mjs",
 "tests/breach-roadmap4-motor-stride.test.mjs",
 "tests/squad-flow-a1.test.mjs",
 "tests/breach-roadmap2-order-wait.test.mjs",
 "tests/replay-r2-recording.test.mjs",
 "tests/breach-mantle-contract.test.mjs",
 "tests/breach-145.test.mjs"
];
if(process.argv.includes('--list')){
 process.stdout.write(tests.join('\n')+'\n');process.exit(0);
}
for(const file of tests)if(!existsSync(file))
 throw Error('Stage 7 missing regression test: '+file);
const result=spawnSync(process.execPath,
 ['--experimental-strip-types','--test',...tests],
 {stdio:'inherit',env:process.env,timeout:240000});
if(result.error)throw result.error;
process.exit(result.status??1);
