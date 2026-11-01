import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const html=readFileSync(new URL('../map-lab.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/map-lab-main.ts',import.meta.url),'utf8');
test('Map Lab exposes an explicit opt-in spatial QA visualization',()=>{
 assert.match(html,/id="qualityOverlay"/);
 assert.match(html,/quality-risk/);
 assert.match(main,/qualityOverlay.*checked/);
 assert.match(main,/spaceMetric\.solidFraction/);
 assert.match(main,/doorApproachIssues\.some/);
});
test('quality overlay does not take over room labels unless checked',()=>{
 assert.match(main,/const showQuality=el<HTMLInputElement>\('qualityOverlay'\)\.checked/);
 assert.match(main,/if\(showQuality&&trouble\)/);
 assert.match(main,/showQuality&&spaceMetric/);
});
