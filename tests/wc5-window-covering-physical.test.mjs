import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeWindowCovering} from '../src/breach-window-coverings.ts';
import {desiredCovering,coveringContactPoint,coveringTransitionClear,coveringActionSeconds} from '../src/breach-window-covering-interaction.ts';
import {hardCoveringBlocksTraversal,hardCoveringBlocksPaneContact,coveringDamageAfterHit} from '../src/breach-window-covering-physical.ts';
import {canClimbWindow,canOpenWindowForClimb,windowClimbAvailability} from '../src/breach-mantle.ts';
import {windowAcousticFactor} from '../src/breach-window-acoustics.ts';
import {strikeSurface} from '../src/breach-ballistic-resolution.ts';
import {createShotEnvironmentCommitter} from '../src/breach-shot-environment.ts';
import {windowCoveringsBlockSight,setSessionWindowCovering} from '../src/breach-window-covering-optics.ts';
const p=(x,y)=>({x,y});
const c=(family,opening=0,locked=false)=>normalizeWindowCovering({covering:{family,opening,locked,palette:'slate',side:1}});
const pane=(family,opening=0)=>({id:'W',x:300,y:200,width:48,vertical:false,sillHeight:14,headHeight:43,open:false,shattered:false,operable:true,integrity:1,covering:c(family,opening)});
const make=w=>({site:{walls:[],cover:[],windows:[w]},windows:[w],coverState:[],doors:[],objectRevision:0,illuminationRevision:0,operators:[],civilians:[],seconds:1});
const outside=p(300,240),inside=p(300,160);
test('hard panels block traversal after independent glass break; soft coverings never do',()=>{
 for(const family of ['hinged-shutter','rolling-shutter']){
  const w=pane(family);assert.equal(canOpenWindowForClimb(w),false);
  w.shattered=true;w.open=true;
  assert.equal(windowClimbAvailability(w),'blocked');assert.equal(canClimbWindow(w),false);
  assert.equal(hardCoveringBlocksPaneContact(w,outside),true);
  assert.equal(hardCoveringBlocksPaneContact(w,inside),false);
  w.covering=c(family,1);assert.equal(canClimbWindow(w),true);
  w.covering={...c(family),integrity:0};assert.equal(canClimbWindow(w),true);
 }
 assert.equal(canClimbWindow({...pane('curtain'),shattered:true}),true);
});
test('rolling locks are explicit interior-side controls; hinged shutters open fully',()=>{
 const locked=c('rolling-shutter',0,true);
 assert.equal(desiredCovering(locked,'open-covering'),null);
 const unlocked=desiredCovering(locked,'unlock-covering');
 assert.equal(unlocked.locked,false);
 assert.equal(desiredCovering(unlocked,'open-covering').opening,1);
 assert.equal(desiredCovering(c('rolling-shutter',1),'lock-covering'),null);
 assert.equal(coveringContactPoint(pane('rolling-shutter'),locked,inside).p.y,192);
 assert.equal(desiredCovering(c('hinged-shutter'),'half-covering'),null);
 assert.ok(coveringActionSeconds(locked)>.76);
});
test('closing into reserved crossings and occupied leaf envelope is rejected',()=>{
 const w=pane('hinged-shutter',1),s=make(w),a={id:'A'},closed=c('hinged-shutter');
 s.operators=[{health:100,traversalPending:{windowId:'W'},p:inside}];
 assert.equal(coveringTransitionClear(s,w,w.covering,closed,a),false);
 s.operators=[];s.civilians=[{health:100,p:p(300,225)}];
 assert.equal(coveringTransitionClear(s,w,w.covering,closed,a),false);
 s.civilians=[];assert.equal(coveringTransitionClear(s,w,w.covering,closed,a),true);
});
test('ordered shutter impact stops before glass from mounted face, not from interior',()=>{
 const w=pane('rolling-shutter'),s=make(w);
 const first=strikeSurface(outside,inside,s,30,30,1,true);
 assert.equal(first.surface,'metal');assert.equal(first.end.y,208);
 assert.deepEqual(first.paneHits,[]);assert.equal(first.coveringHits.length,1);
 const reverse=strikeSurface(inside,outside,s,30,30,1,true);
 assert.deepEqual(reverse.paneHits,[0]);assert.equal(reverse.coveringHits.length,1);
 assert.equal(w.covering.integrity,1);assert.equal(s.objectRevision,0);
 setSessionWindowCovering(s,'W',c('rolling-shutter',1));
 assert.deepEqual(strikeSurface(outside,inside,s,30,30,1).coveringHits,[]);
});
test('soft covering has no ballistic resistance; only committed reached damage changes opacity',()=>{
 const w=pane('curtain'),s=make(w),trace=strikeSurface(outside,inside,s,30,30,1,true);
 assert.equal(trace.coveringHits.length,1);assert.deepEqual(trace.paneHits,[0]);
 assert.equal(trace.end.y,inside.y);
 const commit=createShotEnvironmentCommitter({enemies:()=>[],hear:()=>{},battleEvent:()=>{}});
 commit.damageStruckCoverings(s,trace.coveringHits,1,.01);
 assert.equal(w.covering.integrity,1);
 commit.damageStruckCoverings(s,trace.coveringHits,1);
 assert.equal(w.covering.integrity,0);assert.equal(w.shattered,false);
 assert.equal(windowCoveringsBlockSight(s,outside,inside,30),false);
});
test('hard material integrity, destruction unlock and acoustic state follow independent covering',()=>{
 const w=pane('rolling-shutter'),s=make(w);w.covering=c('rolling-shutter',0,true);
 const next=coveringDamageAfterHit(w.covering,1);
 assert.ok(next.integrity>0&&next.integrity<1);assert.equal(next.locked,true);
 assert.ok(windowAcousticFactor(outside,inside,[w])<windowAcousticFactor(outside,inside,[pane('curtain')]));
 setSessionWindowCovering(s,'W',coveringDamageAfterHit(w.covering,10));
 assert.equal(w.covering.integrity,0);assert.equal(w.covering.locked,false);
 assert.equal(hardCoveringBlocksTraversal(w),false);assert.equal(w.shattered,false);
});
