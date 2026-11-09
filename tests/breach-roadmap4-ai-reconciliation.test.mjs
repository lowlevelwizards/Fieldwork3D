import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession} from '../src/breach-game.ts';
import {reconcileEnemyIntent,reconcileEnemyPosture}
 from '../src/breach-ai-reconciliation.ts';
test('no-contact AI intent never manufactures unobserved target locations',()=>{
 const s=newSession();const enemy=s.operators.find(a=>a.side==='red');
 assert.ok(enemy);
 enemy.contact=null;enemy.heard=null;
 reconcileEnemyIntent(s,enemy,0);
 assert.equal(enemy.contact,null);assert.equal(enemy.heard,null);
 const before=enemy.posture;
 reconcileEnemyPosture(s,enemy,[]);
 assert.ok(['crouch','stand'].includes(enemy.posture));
 assert.ok(['crouch','stand'].includes(before));
});
