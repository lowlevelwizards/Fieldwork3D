import test from 'node:test';
import assert from 'node:assert/strict';
import {visionPolygon,VISION_HALF_ANGLE} from '../src/breach-vision-polygon.ts';
import {opticalBlockerSegments} from '../src/breach-optical-occlusion.ts';

const cross=(ax,ay,bx,by)=>ax*by-ay*bx;
function oldPolygon(origin,heading,range,walls,doors,lowObstructs,cover){
 const blockers=opticalBlockerSegments(walls,doors,cover,lowObstructs);
 const angles=[];
 for(let i=0;i<=64;i++)angles.push(-VISION_HALF_ANGLE+2*VISION_HALF_ANGLE*i/64);
 for(const line of blockers)for(const point of [line.a,line.b]){
  const absolute=Math.atan2(point.y-origin.y,point.x-origin.x);
  const delta=Math.atan2(Math.sin(absolute-heading),Math.cos(absolute-heading));
  if(Math.abs(delta)>VISION_HALF_ANGLE+.004)continue;
  for(const eps of [-.0015,0,.0015])
   angles.push(Math.max(-VISION_HALF_ANGLE,Math.min(VISION_HALF_ANGLE,delta+eps)));
 }
 angles.sort((a,b)=>a-b);
 const polygon=[{...origin}];let last=-Infinity;
 for(const delta of angles){
  if(delta-last<.0001)continue;
  last=delta;
  const angle=heading+delta,dx=Math.cos(angle),dy=Math.sin(angle);
  let hit=range;
  for(const edge of blockers){
   const ex=edge.b.x-edge.a.x,ey=edge.b.y-edge.a.y;
   const ox=edge.a.x-origin.x,oy=edge.a.y-origin.y;
   const denom=cross(dx,dy,ex,ey);
   if(Math.abs(denom)<1e-8)continue;
   const t=cross(ox,oy,ex,ey)/denom,u=cross(ox,oy,dx,dy)/denom;
   if(t>=0&&u>=0&&u<=1)hit=Math.min(hit,t);
   if(hit<=.05)break;
  }
  polygon.push({x:origin.x+dx*hit,y:origin.y+dy*hit});
 }
 return polygon;
}
test('vision range broadphase returns identical polygon points and occlusions',()=>{
 let seed=61117;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const span=(min,max)=>min+(max-min)*random();
 for(let trial=0;trial<80;trial++){
  const origin={x:span(-300,300),y:span(-300,300)};
  const heading=span(-Math.PI,Math.PI),range=span(60,360);
  const walls=Array.from({length:36},()=>({
   a:{x:span(-700,700),y:span(-700,700)},
   b:{x:span(-700,700),y:span(-700,700)}
  }));
  const cover=Array.from({length:24},()=>({
   x:span(-700,700),y:span(-700,700),
   w:span(8,150),h:span(8,150),low:random()<.5
  }));
  const doors=Array.from({length:4},(_,i)=>({
   id:String(i),a:{x:span(-500,500),y:span(-500,500)},
   b:{x:span(-500,500),y:span(-500,500)},
   open:random()<.5,openedAt:0,
   openFraction:random(),style:random()<.2?'glazed':'steel'
  }));
  const low=trial%2===0;
  const actual=visionPolygon(origin,heading,range,walls,doors,low,cover);
  const expected=oldPolygon(origin,heading,range,walls,doors,low,cover);
  assert.equal(actual.length,expected.length,'vertex count '+trial);
  for(let i=0;i<actual.length;i++){
   assert.ok(Math.abs(actual[i].x-expected[i].x)<1e-7,'x '+trial+':'+i);
   assert.ok(Math.abs(actual[i].y-expected[i].y)<1e-7,'y '+trial+':'+i);
  }
 }
});
