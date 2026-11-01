import test from 'node:test';import {readFileSync} from 'node:fs';import assert from 'node:assert/strict';
import {newSession,team,planNearbyInteraction} from '../src/breach-game.ts';
test('authored physical interactions preserve waypoint intent',()=>{
 const s=newSession();
 const a=team(s)[0];
 const original=a.plan.length;
 const result=planNearbyInteraction(s,a.id,'push');
 if(result){
   assert.equal(a.plan.length,original+1);
   const n=a.plan.at(-1);assert.equal(n.kind,'interact');
   assert.match(n.objectId,/^prop:/);
 }else assert.equal(a.plan.length,original);
});

test('interaction executor belongs to simulation, not plan validation',()=>{
 const source=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 const validator=source.slice(source.indexOf('function validEditedPlan('),
  source.indexOf('export function movePlanNode('));
 const motor=source.slice(source.indexOf('function runOrders('),
  source.indexOf('function defensivePosition('));
 assert.doesNotMatch(validator,/movePhysicalProp\(s,index,pushed\)/);
 assert.match(motor,/movePhysicalProp\(s,index,pushed\)/);
});
