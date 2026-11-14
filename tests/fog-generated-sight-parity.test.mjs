/** Real generated-site audit: polygon fog must never disclose floor behind walls.
 * This checks a bounded set of actual initial operator views, not a mock ray.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,observerPointVisible} from '../src/breach-game.ts';
import {paintFogVisibility} from '../src/breach-fog-mask.ts';
import {activateSite} from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
import {sightRangeForSite} from '../src/breach-visibility-range-policy.ts';

function inPoly(p,points){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const a=points[i],b=points[j];
  if(((a.y>p.y)!==(b.y>p.y))&&
    (p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x))inside=!inside;
 }
 return inside;
}
test('generated-site 3D fog sight polygons do not over-disclose indoor ground',()=>{
 const worst=[];
 let checked=0,unseenInPolygon=0;
 for(const seed of [7,19,31,79]){
  const s=newSession(0,seed,'exterior-known','small');
  try{
   const world=sessionWorldGeometry(s);
   for(const a of team(s).slice(0,2)){
    const polygon=visionPolygon(a.p,a.heading,sightRangeForSite(s.site),
      world.walls,s.doors,a.posture==='crouch',world.cover);
    const visited=new Set();
    for(const room of s.site.rooms){
     for(let y=Math.ceil(room.y/20)*20+10;y<room.y+room.h-5;y+=20)
      for(let x=Math.ceil(room.x/20)*20+10;x<room.x+room.w-5;x+=20){
       const key=x+','+y;if(visited.has(key))continue;visited.add(key);
       const p={x,y};checked++;
       if(inPoly(p,polygon)&&!observerPointVisible(s,a,p)){
        unseenInPolygon++;
        if(worst.length<30)worst.push({seed,actor:a.id,heading:a.heading,
          origin:a.p,p});
       }
      }
    }
   }
  }finally{activateSite(null);}
 }
 assert.equal(unseenInPolygon,0,
  'Fog polygons reveal '+unseenInPolygon+' blocked indoor samples / '+checked+
  '; examples: '+JSON.stringify(worst));
});

// Native Canvas fill is radial but remains bounded by the SAME exact sight
// polygon. This avoids a new CPU scan and keeps the fully hidden region opaque.
test('far sight is graded inside actual LOS rather than fully erased',()=>{
 const s=newSession(0,19,'exterior-known','small');
 const gradients=[],fills=[];
 const canvas={width:1,height:1};
 const ctx={canvas,filter:'none',fillStyle:'#fff',
  globalCompositeOperation:'source-over',save(){},restore(){},
  setTransform(){},beginPath(){},moveTo(){},lineTo(){},closePath(){},
  fill(){fills.push({mode:this.globalCompositeOperation,style:this.fillStyle});},
  createRadialGradient(...radii){
   const gradient={radii,stops:[],addColorStop(at,color){this.stops.push({at,color});}};
   gradients.push(gradient);return gradient;
  }};
 try{
  paintFogVisibility(ctx,s);
  assert.equal(gradients.length,team(s).filter(a=>a.health>0).length);
  assert.equal(fills.length,gradients.length);
  assert.ok(fills.every(f=>f.mode==='destination-out'&&gradients.includes(f.style)));
  for(const gradient of gradients){
   assert.equal(gradient.stops[0].color,'rgba(255,255,255,1)');
   assert.equal(gradient.stops.at(-1).color,'rgba(255,255,255,.38)');
   assert.ok(gradient.radii[5]>gradient.radii[2]);
  }
 }finally{activateSite(null);}
});
