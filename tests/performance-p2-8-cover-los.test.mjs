import test from 'node:test';
import assert from 'node:assert/strict';
import {doorBlocksRay,segmentsCross} from '../src/breach-core.ts';
import {registerSessionWorldGeometry} from '../src/breach-world-context.ts';

// Frozen P2.7 reference: scan every cover object for every 8-unit LOS sample.
// The broadphase must affect only candidate selection, never ray outcomes.
function oldClear(from,to,doors,cover,walls,ignoreDoors=false){
 const ray={a:from,b:to};
 if(walls.some(w=>segmentsCross(ray,w)))return false;
 if(!ignoreDoors&&doorBlocksRay(doors,ray))return false;
 const length=Math.hypot(from.x-to.x,from.y-to.y);
 const n=Math.max(1,Math.ceil(length/8));
 for(let i=1;i<n;i++){
  const t=i/n,p={x:from.x+(to.x-from.x)*t,
   y:from.y+(to.y-from.y)*t};
  if(cover.some(o=>!['chain-link-fence','iron-fence'].includes(o.fixture??'')&&
      Math.abs(p.x-o.x)<o.w/2&&Math.abs(p.y-o.y)<o.h/2))
   return false;
 }
 return true;
}
const rand=seed=>()=>((seed=Math.imul(seed,1664525)+1013904223|0)>>>0)/4294967296;
test('P2.8 cover broadphase preserves exact stepped sight and revisions',()=>{
 const random=rand(8128);
 const walls=[
  {a:{x:220,y:100},b:{x:220,y:350}},
  {a:{x:370,y:280},b:{x:490,y:280}}
 ];
 const cover=Array.from({length:135},(_,i)=>({
  x:10+random()*540,y:10+random()*540,
  w:6+random()*65,h:6+random()*50,
  fixture:i%23===0?'iron-fence':i%19===0?'chain-link-fence':'desk'
 }));
 const site={seed:8128,walls,cover,bounds:{
  minX:0,minY:0,maxX:600,maxY:600
 }};
 const state={site,coverState:cover,objectRevision:0};
 const world=registerSessionWorldGeometry(state);
 const doors=[{a:{x:145,y:260},b:{x:171,y:260},open:false,
  openFraction:0,hinge:'a',swing:-1,kind:'hinged'}];
 const verify=()=>{
  for(let i=0;i<420;i++){
   const a={x:random()*570,y:random()*570};
   const b={x:random()*570,y:random()*570};
   for(const ignore of [false,true])
    assert.equal(world.isClear(a,b,doors,ignore),
     oldClear(a,b,doors,cover,walls,ignore),'ray '+i+' ignore '+ignore);
  }
 };
 verify();
 // In-place furniture movement changes the same indexed session only when
 // the authoritative object revision increments. Avoid stale LOS after shove.
 cover[7].x+=96;cover[7].y-=35;state.objectRevision++;
 doors[0].open=true;doors[0].openFraction=.75;
 verify();
});
