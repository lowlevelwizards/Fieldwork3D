/** One curated, low-latency regression gate for architecture PRs.
 * Use "node scripts/verification/breach-critical-suite.mjs" locally or in CI.
 * --list prints the exact tests. Additional expensive audits stay opt-in.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
const tests=[
 'tests/breach-roadmap2-stage1-contracts.test.mjs',
 'tests/breach-roadmap2-stage1-soak.test.mjs',
 'tests/breach-roadmap4-ai-reconciliation.test.mjs',
 'tests/breach-roadmap4-world-geometry.test.mjs',
 'tests/breach-roadmap4-motor-stride.test.mjs',
 'tests/breach-roadmap4-pose-finalizer.test.mjs',
 'tests/breach-roadmap4-ballistic-resolution.test.mjs',
 'tests/breach-roadmap4-plan-authoring.test.mjs',
 'tests/breach-roadmap4-simulation-phases.test.mjs',
 'tests/breach-roadmap4-actor-presentation.test.mjs',
 'tests/breach-roadmap3-scenarios.test.mjs',
 'tests/breach-roadmap3-combat-effects.test.mjs',
 'tests/breach-roadmap3-context-commands.test.mjs',
 'tests/breach-roadmap3-3d-disclosure.test.mjs',
 'tests/breach-roadmap3-site-exterior.test.mjs',
 'tests/breach-roadmap3-order-utility.test.mjs',
 'tests/breach-roadmap3-ai-visual.test.mjs',
 'tests/breach-roadmap3-locomotion-clearance.test.mjs',
 'tests/breach-roadmap3-shot-ignition.test.mjs',
 'tests/breach-roadmap3-sling-pose.test.mjs',
 'tests/breach-roadmap3-world-context.test.mjs',
 'tests/breach-roadmap2-deterministic.test.mjs',
 'tests/breach-roadmap2-site-mobility.test.mjs',
 'tests/breach-roadmap2-visibility-contract.test.mjs',
 'tests/breach-roadmap2-debrief-extraction.test.mjs',
 'tests/breach-roadmap2-site-builder.test.mjs',
 'tests/breach-roadmap2-door-pressure.test.mjs',
 'tests/breach-roadmap2-order-wait.test.mjs',
 'tests/breach-roadmap2-acoustic-perception.test.mjs',
 'tests/breach-roadmap2-impact-evidence.test.mjs',
 'tests/breach-roadmap2-pose-locomotion.test.mjs',
 'tests/breach-roadmap2-geometry-scope.test.mjs',
 'tests/breach-physical-interactions-nov8.test.mjs',
 'tests/doorway-right-of-way-session.test.mjs',
 'tests/breach-fog-visibility.test.mjs',
 'tests/breach-runtime-loop-step12.test.mjs'
];
if(process.argv.includes('--list')){
 process.stdout.write(tests.join('\n')+'\n');
 process.exit(0);
}
for(const file of tests)
 if(!existsSync(file))throw Error('Critical regression missing: '+file);
const run=spawnSync(process.execPath,
 ['--experimental-strip-types','--test',...tests],
 {stdio:'inherit',env:process.env});
if(run.error)throw run.error;
process.exit(run.status??1);
