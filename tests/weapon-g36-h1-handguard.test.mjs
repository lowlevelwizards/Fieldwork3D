/** H1 original G36 handguard: approved six-plane silhouette and graphic slots. */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildG36OriginalBlockout} from '../src/weapons/geometry/g36-silhouettes.ts';
import {G36_LONG_FOREND_RINGS}
 from '../src/weapons/geometry/g36-handguard-profiles.ts';
import {applyG36PixelDetails,g36PixelAtlas,g36PixelAtlasLayout}
 from '../src/weapons/geometry/g36-pixel-details.ts';
import {G36_B_ART as A} from '../src/weapons/geometry/g36-art-layout.ts';
import {clearWeaponSilhouette} from '../src/breach-weapon-geometry.ts';
const one=(g,key)=>g.children.find(m=>m.userData[key]);
const bbox=m=>new THREE.Box3().setFromObject(m);
const near=(a,b,eps=.025)=>Math.abs(a-b)<eps;
const sample=(col,x,y)=>{
 const tileX=Math.floor((x-3.75)/(13.45-3.75)*96);
 const tileY=Math.floor((y+2.15)/(1.55+2.15)*96);
 const d=g36PixelAtlas().image.data;
 return d[(tileY*384+col*96+tileX)*4];
};

test('H1: real factory exposes one chunky six-corner shell with no extra pieces',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const handguards=g.children.filter(x=>x.userData.g36LongHandguard);
 assert.equal(handguards.length,1);
 const h=handguards[0],p=h.geometry.getAttribute('position');
 assert.equal(h.userData.g36HandguardArtVersion,'h1-six-plane-original');
 assert.equal(h.userData.g36HandguardSectionSides,6);
 assert.equal(G36_LONG_FOREND_RINGS.length,3);
 assert.equal(p.count,96,'24 side + 8 endcap triangles, no ornament');
 assert.equal(g.children.length,22,'same production mesh/draw-call count');
 const allTriangles=g.children.reduce((n,x)=>
  n+(x.geometry.index?.count??x.geometry.getAttribute('position').count)/3,0);
 assert.ok(allTriangles<=600,'within shared HK triangle ceiling');
 clearWeaponSilhouette(g);m.dispose();
});

test('H1: same mount and factory endpoints, fat midbody, deliberate blunt tapered nose',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const h=one(g,'g36LongHandguard'),attr=h.geometry.getAttribute('position');
 const rings=G36_LONG_FOREND_RINGS.map(r=>{
  const data=[];
  for(let i=0;i<attr.count;i++)
   if(near(attr.getX(i),r.x,.005))data.push([attr.getY(i),attr.getZ(i)]);
  const yz=[...new Set(data.map(([y,z])=>y.toFixed(4)+','+z.toFixed(4)))];
  return {r,yz,minY:Math.min(...data.map(p=>p[0])),
   maxY:Math.max(...data.map(p=>p[0])),maxZ:Math.max(...data.map(p=>Math.abs(p[1])))};
 });
 for(const ring of rings)assert.equal(ring.yz.length,6,
  'exactly six contour landmarks per fore-end station');
 assert.ok(near(rings[0].r.x,3.75)&&near(rings[2].r.x,13.45));
 assert.ok(near(rings[0].maxY,1.35)&&near(rings[0].minY,-1.88));
 assert.ok(near(rings[0].maxZ,1.45));
 assert.ok(near(rings[1].maxZ,1.45)&&near(rings[2].maxZ,1.32));
 assert.ok((rings[2].maxY-rings[2].minY)/(rings[1].maxY-rings[1].minY)>.78);
 assert.ok(bbox(h).intersectsBox(bbox(one(g,'g36ReceiverUpper'))));
 assert.ok(bbox(h).intersectsBox(bbox(one(g,'g36Barrel'))));
 assert.ok(near(bbox(g).max.x,A.muzzleX));
 clearWeaponSilhouette(g);m.dispose();
});

test('H1: upper facets, broad middle side and tucked floor are real geometry',()=>{
 const m=new THREE.MeshBasicMaterial(),g=buildG36OriginalBlockout(m);
 const attr=one(g,'g36LongHandguard').geometry.getAttribute('position');
 const points=new Map();
 for(let i=0;i<attr.count;i++){
  if(!near(attr.getX(i),3.75,.005))continue;
  const y=attr.getY(i),z=Math.abs(attr.getZ(i));
  points.set(y.toFixed(3)+'|'+z.toFixed(3),{y,z});
 }
 const coords=[...points.values()];
 assert.equal(coords.length,3,'symmetric six-sided contour has three levels');
 const ordered=coords.sort((a,b)=>b.y-a.y);
 assert.ok(near(ordered[0].y,1.35),'flat full roof');
 assert.ok(ordered[0].z<ordered[1].z-.2,
  'upper shoulders expand toward broad sides');
 assert.ok(ordered[2].z<ordered[1].z-.15,
  'lower corners tuck inward into a flat floor');
 assert.ok(ordered[2].z>1.1,'not a sharp bottom keel');
 clearWeaponSilhouette(g);m.dispose();
});

test('H1: four high-contrast shallow vent slots per side in ONE stable atlas',()=>{
 const layout=g36PixelAtlasLayout(),atlas=g36PixelAtlas();
 assert.equal(layout.ventsPerSide,4);
 assert.equal(layout.width,384);
 assert.equal(layout.height,192);
 assert.strictEqual(g36PixelAtlas(),atlas,'pixel texture is pooled');
 for(const col of [0,1]){
  const run=[],scanY=.12;
  let active=false;
  for(let x=0;x<96;x++){
   const u=3.75+(x+.5)/96*(13.45-3.75);
   const dark=sample(col,u,scanY)<110;
   if(dark&&!active){run.push({start:x,end:x});active=true;}
   if(dark&&active)run[run.length-1].end=x;
   if(!dark)active=false;
  }
  assert.equal(run.length,4,'exactly four separate side markings');
  for(const slot of run)assert.ok(slot.end-slot.start>=13,
   'slot remains wide enough to read on mobile');
  for(const cx of [5.35,7.40,9.45,11.50]){
   assert.ok(sample(col,cx,.12)<110,'inside long slot');
   assert.equal(sample(col,cx,.68),255,'no extra marks above side slots');
   assert.equal(sample(col,cx,-.50),255,'no vents bleeding into underside');
  }
 }
 const m=new THREE.MeshStandardMaterial(),g=buildG36OriginalBlockout(m);
 const before=g.children.length;
 applyG36PixelDetails(g);
 const first=g.children.find(x=>x.userData.g36LongHandguard);
 assert.equal(g.children.length,before,'no added vent geometry');
 assert.equal(first.userData.g36AtlasProjected,true);
 const material=first.material;
 assert.strictEqual(material.map,atlas);
 applyG36PixelDetails(g);
 assert.strictEqual(first.material,material,'no repeated clone/material churn');
 clearWeaponSilhouette(g);m.dispose();
});
