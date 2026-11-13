import test from 'node:test';
import assert from 'node:assert/strict';
import {angularRayBuckets} from '../src/breach-ray-angle-buckets.ts';

const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
const hit=(o,dx,dy,s,range)=>{
 const ex=s.b.x-s.a.x,ey=s.b.y-s.a.y;
 const ox=s.a.x-o.x,oy=s.a.y-o.y;
 const denom=cross(dx,dy,ex,ey);
 if(Math.abs(denom)<1e-8)return range;
 const t=cross(ox,oy,ex,ey)/denom;
 const u=cross(ox,oy,dx,dy)/denom;
 return t>=0&&u>=0&&u<=1?Math.min(range,t):range;
};
test('V1 angular broadphase produces exactly the exhaustive closest blocker',()=>{
 let seed=13;
 const random=()=>((seed=Math.imul(seed,1664525)+1013904223>>>0)/4294967296);
 let rays=0,reduced=0;
 for(let sample=0;sample<12;sample++){
  const origin={x:100+random()*250,y:100+random()*250};
  const heading=random()*6.28-3.14;
  const segments=[];
  for(let i=0;i<130;i++){
   const x=(random()-.5)*2400+origin.x;
   const y=(random()-.5)*2400+origin.y;
   segments.push({a:{x,y},b:{x:x+(random()-.5)*150,
      y:y+(random()-.5)*150}});
  }
  const buckets=angularRayBuckets(origin,heading,segments,1.15);
  for(let i=0;i<120;i++){
   const delta=(i/119*2-1)*1.15;
   const angle=heading+delta;
   const dx=Math.cos(angle),dy=Math.sin(angle);
   let exhaustive=1600,optimized=1600;
   for(const edge of segments)exhaustive=Math.min(exhaustive,hit(origin,dx,dy,edge,exhaustive));
   const shortlist=buckets.candidates(delta);
   for(const edge of shortlist)optimized=Math.min(optimized,hit(origin,dx,dy,edge,optimized));
   assert.ok(Math.abs(optimized-exhaustive)<1e-7,
     'shortlist cannot omit real obstruction: sample '+sample+' ray '+i);
   reduced+=shortlist.length<segments.length?1:0;
   rays++;
  }
 }
 assert.ok(reduced/rays>.80,'most long-range rays avoid unnecessary segment tests');
});
