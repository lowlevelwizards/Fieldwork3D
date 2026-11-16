import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SKILL_NAMES as shared} from '../src/campaign-skill-schema.ts';
import {SKILL_NAMES as publicNames,newCampaign,acceptContract,
 resolveOperation,readCampaign} from '../src/campaign-state.ts';
import {progressOperator} from '../src/campaign-progression.ts';

const file=(name)=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('E3.C1 campaign skills have a single ordered runtime vocabulary and preserve public API',()=>{
 assert.strictEqual(publicNames,shared,'existing consumers retain the exact same shared array');
 assert.deepEqual(shared,[
  'pointShooting','longRange','precision','recoilControl','composure','handling'
 ]);
 const state=file('campaign-state.ts');
 const progress=file('campaign-progression.ts');
 const schema=file('campaign-skill-schema.ts');
 assert.match(state,/export \{SKILL_NAMES\}/);
 assert.match(state,/export type \{SkillName\}/);
 assert.match(progress,/import type \{CampaignOperator\} from '\.\/campaign-state\.ts'/);
 assert.doesNotMatch(progress,/import \{SKILL_NAMES\} from '\.\/campaign-state\.ts'/,
  'progression must no longer depend on campaign-state at runtime');
 assert.doesNotMatch(schema,/from '\.\/campaign-(?:state|progression)\.ts'/,
  'schema remains a dependency leaf rather than moving the cycle');
});
test('E3.C1 saved campaign and post-operation progression retain their contract',()=>{
 const fresh=newCampaign(3411),job=fresh.contracts[0];
 const participant=fresh.operators.find(o=>o.id==='rook');
 assert.ok(participant);
 const performance={
  id:'rook',shots:12,hits:7,pointShots:4,aimedShots:8,longHits:2,
  injuryStage:1,survived:true,magazine:6,reserve:90
 };
 const direct=progressOperator(participant,performance,true);
 assert.ok(direct.operator.skills.precision>participant.skills.precision);
 assert.ok(direct.gains.gains.precision>0);
 assert.deepEqual(Object.keys(direct.operator.skills).sort(),
  [...shared].sort());
 const active=acceptContract(fresh,job.id);
 const report={id:'e3c1-3411',contractId:job.id,day:active.day,
  outcome:'success',grade:'A',elapsed:65,participatingIds:['rook'],
  casualties:[],objective:true,events:[],performance:[performance]};
 const done=resolveOperation(active,report);
 const after=done.operators.find(o=>o.id==='rook');
 assert.equal(after.skills.precision,direct.operator.skills.precision);
 assert.equal(after.experience.precision,direct.operator.experience.precision);
 assert.equal(after.shotsFired,direct.operator.shotsFired);
 assert.deepEqual(readCampaign(JSON.stringify(done)),done);
 assert.deepEqual(resolveOperation(done,report),done,
  'replay of committed operation cannot award career XP twice');
});
