/** Roadmap 2 Stage 8: comprehensive existing authentic fixed-tick order
 * and replay scenarios; frozen Stage 1 outcomes also run in critical gate.
 * No scripted speed threshold or baseline re-fingerprinting.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const tests=[
 "tests/breach-roadmap2-stage8-orders.test.mjs",
 "tests/breach-roadmap2-stage1-soak.test.mjs",
 "tests/breach-roadmap2-order-wait.test.mjs",
 "tests/breach-roadmap3-order-utility.test.mjs",
 "tests/tactical-integration-14-execution-feedback.test.mjs",
 "tests/breach-137-1.test.mjs",
 "tests/civilian-r2-rescue-transport.test.mjs",
 "tests/civilian-r2-ux-release.test.mjs",
 "tests/civilian-r2-transport-replay.test.mjs",
 "tests/mission-escort-physicality.test.mjs",
 "tests/equipment-22-07-transport.test.mjs",
 "tests/breach-mantle-session.test.mjs",
 "tests/equipment-22-04-treatment.test.mjs",
 "tests/equipment-22-08-casualty-extraction.test.mjs",
 "tests/equipment-24-02-access-timing.test.mjs",
 "tests/tactical-integration-13-execution-status.test.mjs",
 "tests/doorway-planned-sequence.test.mjs",
 "tests/physicality-08-door-contact.test.mjs",
 "tests/door-desk-chair-gridlock-nov9.test.mjs",
 "tests/breach-roadmap2-stage2-physical-integrity.test.mjs",
 "tests/breach-roadmap2-stage3-integration.test.mjs",
 "tests/breach-roadmap2-stage4-replay-presentation.test.mjs",
 "tests/replay-r2-recording.test.mjs",
 "tests/breach-145.test.mjs",
 "tests/replay-prop-stability-20261108.test.mjs",
 "tests/dnav-r6-movement-quality.test.mjs",
 "tests/tactical-integration-00-baseline.test.mjs",
 "tests/tactical-integration-01-recovery.test.mjs"
];
if(process.argv.includes('--list')){
 process.stdout.write(tests.join('\n')+'\n');process.exit(0);
}
for(const file of tests)if(!existsSync(file))
 throw Error('Missing required Stage 8 scenario: '+file);
const result=spawnSync(process.execPath,
 ['--experimental-strip-types','--test',...tests],
 {stdio:'inherit',env:process.env,timeout:240000,maxBuffer:8*1024*1024});
if(result.error)throw result.error;
process.exit(result.status??1);
