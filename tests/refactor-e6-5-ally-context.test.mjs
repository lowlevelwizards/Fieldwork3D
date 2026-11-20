/** E6.5 single-pass presentation ally scan parity. This does not test
 * authoritative muzzle collision or claim browser/GPU FPS changes. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {teammateAheadForHandling,teammateAheadProjectedOffset}
 from '../src/breach-handling-context.ts';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const loop=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
const baseline=(actor,draw,roster,stackContext)=>{
 let stackCrowded=false;
 const safety=[];
 for(const peer of roster){
  if(peer===actor||peer.side!==actor.side||peer.health<=0)continue;
  const stackX=peer.p.x-actor.p.x,stackY=peer.p.y-actor.p.y;
  if(stackContext&&!stackCrowded&&stackX*stackX+stackY*stackY<40*40)
   stackCrowded=true;
  const safetyX=peer.p.x-draw.x,safetyY=peer.p.y-draw.z;
  if(safetyX*safetyX+safetyY*safetyY<90*90)safety.push(peer.id);
 }
 return {stackCrowded,
  actuallyAhead:teammateAheadForHandling(actor.p,actor.heading,roster,actor),
  safety};
};
const fused=(actor,draw,roster,stackContext)=>{
 const fx=Math.cos(actor.heading),fy=Math.sin(actor.heading);
 let stackCrowded=false,actuallyAhead=false;
 const safety=[];
 for(const peer of roster){
  if(peer===actor||peer.side!==actor.side||peer.health<=0)continue;
  const stackX=peer.p.x-actor.p.x,stackY=peer.p.y-actor.p.y;
  if(stackContext&&!stackCrowded&&stackX*stackX+stackY*stackY<40*40)
   stackCrowded=true;
  if(!actuallyAhead&&teammateAheadProjectedOffset(
    stackX,stackY,fx,fy))actuallyAhead=true;
  const safetyX=peer.p.x-draw.x,safetyY=peer.p.y-draw.z;
  if(safetyX*safetyX+safetyY*safetyY<90*90)safety.push(peer.id);
 }
 return {stackCrowded,actuallyAhead,safety};
};
function random(seed){
 let v=seed>>>0;
 return ()=>{v=(Math.imul(v,1664525)+1013904223)>>>0;return v/4294967296;};
}
test('directional helper exactly preserves inclusive and exclusive thresholds',()=>{
 for(let angle=-4;angle<4;angle+=.19){
  const fx=Math.cos(angle),fy=Math.sin(angle);
  for(const forward of [0,3.999,4,4.001,24,47.999,48,49]){
   for(const across of [-9,-8.5,-8.499,0,8.499,8.5,9]){
    const dx=forward*fx+across*fy;
    const dy=forward*fy-across*fx;
    const old=teammateAheadForHandling({x:0,y:0},angle,
      [{x:dx,y:dy}]);
    const next=teammateAheadProjectedOffset(dx,dy,fx,fy);
    assert.equal(next,old);
   }
  }
 }
});
test('single-pass ally context preserves original two scans for mixed rosters',()=>{
 for(let seed=1;seed<=1200;seed++){
  const rng=random(seed*637);
  const roster=Array.from({length:seed%24+1},(_,i)=>({
   id:'a'+i,side:i%4===0?'red':'blue',health:i%7===0?0:100,
   p:{x:(rng()-.5)*180,y:(rng()-.5)*180},
   heading:(rng()-.5)*6.3
  }));
  // Always include a living blue actor even in hostile-heavy samples.
  roster[0].side='blue';roster[0].health=100;
  const actor=roster[0];
  const draw={x:actor.p.x+(rng()-.5)*4,z:actor.p.y+(rng()-.5)*4};
  for(const stackContext of [false,true]){
   const earlier=baseline(actor,draw,roster,stackContext);
   const now=fused(actor,draw,roster,stackContext);
   assert.deepEqual(now,earlier,'seed '+seed+' stack '+stackContext);
  }
 }
});
test('single-pass does not filter actors by visibility or copy safety peer bodies',()=>{
 const self={id:'self',side:'blue',health:100,
  heading:0,p:{x:0,y:0}};
 const roster=[self,
  {id:'forward',side:'blue',health:100,p:{x:6,y:0}},
  {id:'danger-close',side:'blue',health:100,p:{x:0,y:85}},
  {id:'hostile',side:'red',health:100,p:{x:6,y:0}},
  {id:'down',side:'blue',health:0,p:{x:6,y:0}}];
 assert.deepEqual(fused(self,{x:0,z:0},roster,true),
  baseline(self,{x:0,z:0},roster,true));
 assert.deepEqual(fused(self,{x:0,z:0},roster,true),{
  stackCrowded:true,actuallyAhead:true,safety:['forward','danger-close']
 });
});
test('scene has exactly one teammate pass per posed operator; PERF remains opt-in',()=>{
 const block=scene.slice(scene.indexOf('// E6.5: directional muzzle courtesy'),
  scene.indexOf('// Physical contact is queried from',scene.indexOf('// E6.5: directional muzzle courtesy')));
 assert.ok(block.length>100);
 assert.equal((block.match(/for\(const peer of allyPeers\)/g)||[]).length,1);
 assert.match(block,/const allyPeers=useAllyBroadphase\?/);
 assert.match(block,/this\.frameActorNeighborhood\.candidates\(/);
 assert.match(block,/:s\.operators;/);
 assert.match(block,/if\(peer===actor\|\|peer\.side!==actor\.side\|\|peer\.health<=0\)continue/);
 assert.match(block,/teammateAheadProjectedOffset\(/);
 assert.match(block,/stackX\*stackX\+stackY\*stackY<40\*40/);
 assert.match(block,/safetyX\*safetyX\+safetyY\*safetyY<90\*90/);
 assert.match(block,/nearbyAllies\.push\(safetyBodyFor\(peer\)\)/);
 assert.doesNotMatch(block,/teammateAheadForHandling\(/);
 assert.match(block,/if\(this\.profileSceneUpdate\)\{/);
 assert.match(scene,/this\.actorPhaseCosts\.allyPeerVisits\+=allyPeers\.length/);
 assert.match(scene,/this\.actorPhaseCosts\.allyContextMs\+=performance\.now\(\)-allyStart/);
 assert.match(loop,/E6\.5 ALLY CONTEXT/);
 assert.match(loop,/intervalE6\.allyContextMs\+=actorCost\?\.allyContextMs\?\?0/);
 assert.match(scene,/withinContactPrewarmBudget\(true,coldPrewarmBuilt\)/);
 assert.match(scene,/paintFogVisibility\(this\.fogContext,s\)/);
});
