import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
 newSession,team,plannedControl,planWaitAt,planWatch,releaseWatch,
 planSync,toggleContactRule,undoPlan
} from '../src/breach-game.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('A7 game facade retains one implementation owner per extracted contract',()=>{
 const game=source('src/breach-game.ts');
 for(const symbol of ['newSession','stepSession'])
  assert.match(game,new RegExp('export function '+symbol+'\\('));
 for(const [name,file] of [
  ['withActions','src/breach-actor-initial-state.ts'],
  ['assembleSession','src/breach-session-factory.ts'],
  ['legalMoveRoute','src/breach-known-route-authoring.ts'],
  ['finalPoint','src/breach-plan-node-commands.ts'],
  ['planWatch','src/breach-plan-aim-commands.ts'],
  ['planSync','src/breach-plan-utility-commands.ts'],
  ['plannedControl','src/breach-tactical-control-commands.ts'],
  ['debrief','src/breach-mission-reporting.ts']
 ]){
  const owner=source(file);
  assert.match(owner,new RegExp('(?:export (?:const|function) )'+name+'\\b'),name+' has one owner');
  assert.doesNotMatch(game,new RegExp('export (?:const|function) '+name+'\\b'),name+' is not duplicated');
  assert.match(owner,/import type \{[^}]*\} from '\.\/breach-game\.ts';/,
   file+' must import game contract as type only');
 }
});

test('A7 authoring exports retain atomic initial plan behavior',()=>{
 const s=newSession(0),own=team(s);
 assert.equal(s.phase,'planning');
 assert.ok(own.length>=1);
 const a=own[0];
 assert.deepEqual(plannedControl(s,a.id),{posture:'stand',pace:'walk'});
 assert.equal(toggleContactRule(s,a.id),true);
 assert.equal(a.haltOnContact,true);
 assert.equal(undoPlan(s,a.id),true);
 assert.equal(a.haltOnContact,false);
 assert.equal(planWaitAt(s,a.id,1,'here'),true);
 assert.equal(a.plan[0].kind,'wait');
 const p={x:a.p.x+60,y:a.p.y+32};
 assert.equal(planWatch(s,a.id,p,undefined,'here'),true);
 assert.equal(a.plan[0].aimMode,'track');
 assert.deepEqual(a.plan[0].aimPoint,p);
 assert.equal(releaseWatch(s,a.id,a.plan[0].id),true);
 assert.equal(a.plan[0].aimMode,'free');
 assert.equal(a.plan[0].aimPoint,undefined);
});

test('A7 synchronized plan still creates an atomic team transaction',()=>{
 const s=newSession(0);
 const eligible=team(s).filter(a=>a.health>0);
 assert.ok(eligible.length>0);
 assert.equal(planSync(s),true);
 const codes=eligible.map(a=>a.plan.at(-1)?.syncCode);
 assert.ok(codes.every(x=>x===codes[0]&&typeof x==='string'));
});
