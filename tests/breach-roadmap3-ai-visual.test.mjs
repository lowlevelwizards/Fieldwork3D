import test from 'node:test';
import assert from 'node:assert/strict';
import {activateSite} from '../src/breach-core.ts';
import {newSession,team,enemies} from '../src/breach-game.ts';
import {scanEnemyVisualEvidence} from '../src/breach-ai-visual-evidence.ts';
test('confirmed sight raises one contact suspicion and starts reaction once',()=>{
 try{
  const s=newSession(0,19,'full-view','small'),guard=enemies(s)[0],
   friendly=team(s)[0];
  guard.lastVisualSuspicionId=null;
  guard.encounterReactionUntil=Infinity;
  const sight=(_observer,target)=>target===friendly;
  const found=scanEnemyVisualEvidence(s,guard,1/60,sight);
  assert.deepEqual(found.map(x=>x.id),[friendly.id]);
  assert.equal(guard.lastVisualSuspicionId,friendly.id);
  assert.equal(guard.suspicion.stage,'alerted');
  assert.ok(Number.isFinite(guard.encounterReactionUntil));
  const ids=[...guard.suspicion.recentIds],reaction=guard.encounterReactionUntil;
  scanEnemyVisualEvidence(s,guard,1/60,sight);
  assert.deepEqual(guard.suspicion.recentIds,ids);
  assert.equal(guard.encounterReactionUntil,reaction);
  scanEnemyVisualEvidence(s,guard,1/60,()=>false);
  assert.equal(guard.lastVisualSuspicionId,null);
 }finally{activateSite(null);}
});
