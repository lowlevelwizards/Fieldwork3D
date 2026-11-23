/** One curated, low-latency regression gate for architecture PRs.
 * Use "node scripts/verification/breach-critical-suite.mjs" locally or in CI.
 * --list prints the exact tests. Additional expensive audits stay opt-in.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {shardTestPaths} from './test-shards.mjs';
const tests=[
 // R6.4: consolidate the full R6.0-R6.4 lifecycle acceptance into this
 // existing gate; no redundant workflow, motor, or independent order clock.
 'tests/r6-0-tactical-action-audit.test.mjs',
 'tests/r6-1-action-assessment.test.mjs',
 'tests/r6-1-action-go-acceptance.test.mjs',
 'tests/r6-2-physical-contact-policy.test.mjs',
 'tests/r6-2-physical-contact-go.test.mjs',
 'tests/r6-3-action-outcome-provenance.test.mjs',
 'tests/r6-3-live-go-feedback.test.mjs',
 'tests/r6-4-action-integration.test.mjs',
 'tests/contact-medical-choice-20261122.test.mjs',
 'tests/consolidation-stage7-domain-ownership.test.mjs',
 'tests/consolidation-stage8-world-ownership.test.mjs',
 'tests/breach-roadmap2-stage1-contracts.test.mjs',
 'tests/breach-roadmap2-stage2-physical-integrity.test.mjs',
 'tests/breach-roadmap2-stage3-knowledge.test.mjs',
 'tests/breach-roadmap2-stage3-integration.test.mjs',
 'tests/breach-roadmap2-stage4-replay-hud.test.mjs',
 'tests/breach-roadmap2-stage4-replay-presentation.test.mjs',
 'tests/replay-r3-movement-history.test.mjs',
 'tests/refactor-e4f-replay-trail-cursors.test.mjs',
 'tests/replay-r2-event-index.test.mjs',
 'tests/refactor-e4g-replay-hud-event-cursors.test.mjs',
 'tests/refactor-e4h-replay-feed-dom.test.mjs',
 'tests/refactor-e4i-replay-closeout.test.mjs',
 'tests/breach-p7-replay-sharing.test.mjs',
 'tests/performance-p8-replay-memory.test.mjs',
 'tests/refactor-e5-capture-memory.test.mjs',
 'tests/refactor-e5-cap-journals.test.mjs',
 'tests/refactor-e5-memory-study.test.mjs',
 'tests/replay-lifecycle-controller-20261109.test.mjs',
 'tests/refactor-e5-3-browser-memory-contract.test.mjs',
 'tests/refactor-e5-4-sustained-memory.test.mjs',
 'tests/performance-p2-6-contact-prewarm.test.mjs',
 'tests/refactor-e6-cold-contact-prewarm.test.mjs',
 'tests/breach-roadmap2-stage5-performance.test.mjs',
 'tests/breach-roadmap2-stage7-motor.test.mjs',
 'tests/breach-roadmap2-stage8-orders.test.mjs',
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
const selected=shardTestPaths(tests);
if(process.argv.includes('--list')){
 process.stdout.write(selected.join('\n')+'\n');
 process.exit(0);
}
for(const file of tests)
 if(!existsSync(file))throw Error('Critical regression missing: '+file);
if(!selected.length)process.exit(0);
console.log('A1 bounded architecture regression shard',selected.length,'files');
const run=spawnSync(process.execPath,
 ['--experimental-strip-types','--test','--test-concurrency=1',...selected],
 {stdio:'inherit',env:process.env});
if(run.error)throw run.error;
process.exit(run.status??1);
