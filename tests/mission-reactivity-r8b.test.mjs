import test from 'node:test';
import assert from 'node:assert/strict';
import {contactTactic} from '../src/breach-ai-tactical-response.ts';
import {chooseCombatAction} from '../src/breach-ai-combat.ts';
import {directionalCoverFrom} from '../src/breach-cover-direction.ts';
test('R8B: suppressed guard with low morale withdraws only if safe',()=>{
 const action=chooseCombatAction({visible:true,remembered:true,
  laneClear:true,ammunition:10,suppression:.95,morale:.2,temperament:'guard'});
 assert.equal(action,'withdraw');
 assert.deepEqual(contactTactic(action,false),{
  seekCover:true,withdraw:false,holdFire:true,mayReposition:false});
 assert.equal(contactTactic(action,true).withdraw,true);
});
test('R8B: suppressed but resolved defender holds fire rather than overriding aim guard',()=>{
 const action=chooseCombatAction({visible:true,remembered:true,
  laneClear:true,ammunition:10,suppression:.59,morale:.9,temperament:'guard'});
 assert.equal(action,'hold');
 assert.equal(contactTactic(action,false).holdFire,true);
 assert.equal(contactTactic('engage',false).holdFire,false);
});
test('R8B: blocked muzzle wants a reposition, not a blind shot',()=>{
 const action=chooseCombatAction({visible:true,remembered:true,
  laneClear:false,ammunition:10,suppression:.02,morale:1});
 assert.equal(contactTactic(action,false).mayReposition,true);
 assert.equal(contactTactic(action,false).holdFire,true);
});
test('R8B: postural cover is genuine directional height interception',()=>{
 const desk={x:75,y:50,w:40,h:22,fixture:'bar-counter',low:false};
 assert.equal(directionalCoverFrom({x:0,y:50},{x:130,y:50},[desk]).crouched,true);
 assert.equal(directionalCoverFrom({x:130,y:50},{x:0,y:50},[desk]).crouched,true);
 assert.equal(directionalCoverFrom({x:0,y:10},{x:130,y:10},[desk]).crouched,false);
});
