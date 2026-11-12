import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {summarizeEncounterMatrix} from '../src/breach-encounter-matrix.ts';
const fixture=(mission,n,stimulus=false)=>({
 mission,population:{activeHostiles:n,activeCivilians:0},
 hostiles:{coordinatedActors:stimulus?1:0,retreatingActors:0,
  objectiveDefenseActorSeconds:stimulus?2:0,initialDoctrineActors:{organised:n},
  investigationsStarted:stimulus?1:0,investigationsWithoutProgress:0},
 combat:{shots:0,surrenderedHostiles:0},stimulus:{injected:stimulus}
});
test('R6.5 mission matrix accepts quiet empty encounters without claiming success',()=>{
 const matrix=summarizeEncounterMatrix([fixture('clear',0),
  fixture('hold',2,true),fixture('hold',1)]);
 assert.equal(matrix.seedCount,3);
 assert.equal(matrix.missions.clear.shots,0);
 assert.equal(matrix.missions.clear.stimuli,0);
 assert.equal(matrix.missions.hold.seeds,2);
 assert.equal(matrix.missions.hold.defenseSeconds,2);
 assert.equal(matrix.doctrines.organised,3);
});
test('R6.5 opt-in matrix runs a real seeded 20-second fixed-tick Session',()=>{
 const r=spawnSync(process.execPath,[
  '--experimental-strip-types','scripts/audit-mission-quality.mjs',
  '1','--doctrine-matrix'
 ],{cwd:fileURLToPath(new URL('../',import.meta.url)),
 encoding:'utf8',timeout:120000,maxBuffer:8*1024*1024});
 assert.equal(r.signal,null,r.stderr);
 assert.equal(r.status,0,r.stderr);
 const report=JSON.parse(r.stdout);
 assert.equal(report.encounterBehavior.seeds,1);
 assert.ok(report.encounterBehavior.rows[0].seconds>=19);
 assert.equal(report.encounterBehavior.matrix.seedCount,1);
 assert.ok(report.encounterBehavior.matrix.missions.clear);
});
