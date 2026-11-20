import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FrameActorNeighborhoodIndex}
 from '../src/breach-actor-neighborhood.ts';
import {teammateAheadProjectedOffset}
 from '../src/breach-handling-context.ts';

const alive=(a,b)=>a!==b&&a.side===b.side&&b.health>0;
function oldAllyScan(actors,actor,draw,stackContext){
 const x=Math.cos(actor.heading),y=Math.sin(actor.heading);
 const nearby=[],flags={stackCrowded:false,actuallyAhead:false};
 for(const peer of actors){
  if(!alive(actor,peer))continue;
  const dx=peer.p.x-actor.p.x,dy=peer.p.y-actor.p.y;
  if(stackContext&&!flags.stackCrowded&&dx*dx+dy*dy<1600)
   flags.stackCrowded=true;
  if(!flags.actuallyAhead&&teammateAheadProjectedOffset(dx,dy,x,y))
   flags.actuallyAhead=true;
  const sx=peer.p.x-draw.x,sy=peer.p.y-draw.y;
  if(sx*sx+sy*sy<8100)nearby.push(peer);
 }
 return {...flags,nearby};
}
function fastAllyScan(index,actor,draw,stackContext){
 return oldAllyScan(index.candidates(
  actor.p.x,actor.p.y,draw.x,draw.y),actor,draw,stackContext);
}
const actor=(id,x,y,side='blue',health=100,heading=0)=>({
 id,p:{x,y},side,health,heading
});
test('P6.H inclusive 49u diagonal courtesy keeps exact forward/lateral contacts',()=>{
 const center=actor('rook',0,0,'blue',100,Math.PI/4);
 // 47.95 forward and 8.4 transverse = 48.68 radial, just outside 48.
 const fx=Math.cos(center.heading),fy=Math.sin(center.heading);
 const dx=47.95*fx-8.4*fy,dy=47.95*fy+8.4*fx;
 const peer=actor('ash',dx,dy);
 const others=[center,peer,actor('red',2,2,'red'),actor('dead',0,0,'blue',0)];
 const index=new FrameActorNeighborhoodIndex();
 index.rebuild(others);
 assert.equal(oldAllyScan(others,center,{x:400,y:400},false).actuallyAhead,true);
 assert.deepEqual(fastAllyScan(index,center,{x:400,y:400},false),
  oldAllyScan(others,center,{x:400,y:400},false));
});
test('P6.H randomized roster order, repeated IDs, interpolation, sides and replay seek',()=>{
 let seed=0x2ff16;
 const random=()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};
 const idx=new FrameActorNeighborhoodIndex();
 for(let frame=0;frame<24;frame++){
  const count=frame%3===0?16:frame%3===1?88:180;
  const actors=Array.from({length:count},(_,i)=>{
   const pos=frame%2===0?1000:0;
   const a=actor('unit'+(i%19),
    (random()-.5)*1000+pos,(random()-.5)*1000-pos,
    i%3===0?'red':'blue',i%7===0?0:100,random()*Math.PI*2);
   return a;
  });
  actors[0]=actor('rook',frame%2===0?1000:0,0,'blue',100,random()*6.28);
  actors[1]=actor('rook',actors[0].p.x+1,0,'blue');
  idx.rebuild(actors);
  for(let i=0;i<Math.min(actors.length,40);i++){
   const a=actors[i];
   const draw={x:a.p.x+(random()-.5)*70,
    y:a.p.y+(random()-.5)*70};
   for(const stack of [false,true]){
    const old=oldAllyScan(actors,a,draw,stack);
    const next=fastAllyScan(idx,a,draw,stack);
    assert.deepEqual(next,old,'frame='+frame+' actor='+i+' stack='+stack);
   }
  }
 }
 idx.clear();
 assert.equal(idx.candidates(0,0,0,0).length,0,'replay/site reset empties buckets');
});
test('P6.H exact 90u safety radius and fallback preserve original order',()=>{
 const a=actor('a',0,0),b=actor('b',89.9999,0),c=actor('c',90,0);
 const d=actor('d',-89,0),e=actor('e',101,1);
 const list=[a,c,e,d,b],idx=new FrameActorNeighborhoodIndex();
 idx.rebuild(list);
 assert.deepEqual(fastAllyScan(idx,a,{x:0,y:0},false).nearby,
  [d,b]);
 assert.deepEqual(fastAllyScan(idx,a,{x:0,y:0},false),
  oldAllyScan(list,a,{x:0,y:0},false));
});
test('P6.H source uses index only above crowd threshold and leaves exact safety predicates',()=>{
 const code=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(code,/const useAllyBroadphase=s\.operators\.length>=16/);
 assert.match(code,/this\.frameActorNeighborhood\.rebuild\(s\.operators\)/);
 assert.match(code,/this\.frameActorNeighborhood\.candidates\(/);
 assert.match(code,/for\(const peer of allyPeers\)/);
 assert.match(code,/stackX\*stackX\+stackY\*stackY<40\*40/);
 assert.match(code,/teammateAheadProjectedOffset\(/);
 assert.match(code,/safetyX\*safetyX\+safetyY\*safetyY<90\*90/);
 assert.match(code,/this\.frameActorNeighborhood\.clear\(\)/);
});
