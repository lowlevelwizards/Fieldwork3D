import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {CUBE_HEAD_ANATOMY as A} from '../src/operator-head-anatomy.ts';
import {HEAD_SILHOUETTE_METRICS as M,
 createHeadwearSilhouette,headwearCuboidVolumes}
 from '../src/operator-headwear-silhouettes.ts';

const ids=['patrol-cap','boonie','beanie','pasgt','soviet-steel','ach','high-cut'];
const remade=ids.slice(0,5);
const by=(v,name)=>v.find(p=>p.name===name);
const bounds=v=>({
 minX:Math.min(...v.map(p=>p.x-p.width/2)),
 maxX:Math.max(...v.map(p=>p.x+p.width/2)),
 minY:Math.min(...v.map(p=>p.y-p.height/2)),
 maxY:Math.max(...v.map(p=>p.y+p.height/2)),
 minZ:Math.min(...v.map(p=>p.z-p.depth/2)),
 maxZ:Math.max(...v.map(p=>p.z+p.depth/2))
});
const covering=(v,x,y,z)=>v.some(p=>
 Math.abs(x-p.x)<p.width/2-1e-5&&
 Math.abs(y-p.y)<p.height/2-1e-5&&
 Math.abs(z-p.z)<p.depth/2-1e-5);
const lower=(v,x,z)=>{
 const matches=v.filter(p=>Math.abs(x-p.x)<=p.width/2+1e-6&&
  Math.abs(z-p.z)<=p.depth/2+1e-6);
 return Math.min(...matches.map(p=>p.y-p.height/2));
};
const overlap=(a,b,axis)=>{
 const size=axis==='x'?'width':axis==='y'?'height':'depth';
 return Math.min(a[axis]+a[size]/2,b[axis]+b[size]/2)-
  Math.max(a[axis]-a[size]/2,b[axis]-b[size]/2);
};

test('all seven heads render one real orthogonal exterior per wardrobe item',()=>{
 for(const id of ids){
  const v=headwearCuboidVolumes(id);
  const g=createHeadwearSilhouette(id,new THREE.MeshStandardMaterial());
  assert.equal(g.children.length,1,id);
  assert.equal(g.userData.modelAxes,'-Z-forward,+X-right,+Y-up');
  assert.equal(g.children[0].receiveShadow,false,id);
  const geo=g.children[0].geometry;
  assert.equal(geo.userData.greedyCuboidUnion,true,id);
  assert.equal(geo.userData.cuboids.length,v.length,id);
  assert.ok(geo.index.count>=36,id);
  assert.ok(geo.userData.exteriorQuads<150,id+' too many visible planes');
  assert.ok(v.every(p=>p.height>=.70&&p.width>=.90&&p.depth>=.90),
   id+' no micro-cuboid silhouette noise');
  const b=bounds(v),m=M[id];
  assert.ok(Math.abs(b.maxY-m.top)<.002,id+' top metadata is geometry');
  assert.ok(Math.abs(b.minZ-m.frontExtent)<.002,id+' front metadata');
  assert.ok(Math.abs(b.maxZ-m.rearExtent)<.002,id+' rear metadata');
  assert.ok(m.top-A.skullTop<2.2,id+' crown cannot float above skull');
  for(let i=1;i<v.length;i++){
   assert.ok(v.slice(0,i).some(p=>
    overlap(p,v[i],'x')>.10&&overlap(p,v[i],'y')>.10&&
    overlap(p,v[i],'z')>.10),id+' disconnected cuboid: '+v[i].name);
  }
  const stage={
   'patrol-cap':'1M','boonie':'1M','beanie':'1M',
   'pasgt':'1M','soviet-steel':'1M',
   'ach':'1E','high-cut':'1E'
  };
  assert.equal(g.userData.stage,stage[id]);
 }
});

test('soft hats genuinely surround the skull without filling the face',()=>{
 for(const id of ['patrol-cap','boonie','beanie']){
  const v=headwearCuboidVolumes(id);
  assert.equal(covering(v,0,5.1,0),false,id+' lower interior is hollow');
  assert.equal(covering(v,0,4.2,-3),false,id+' face stays exposed');
  assert.ok(covering(v,4.5,5.0,0),id+' has fitted sidewalls');
  assert.ok(covering(v,0,7.0,0),id+' crown joins above skull');
  assert.ok(lower(v,4.4,0)<5.0,id+' side covers forehead/temple');
  assert.ok(M[id].earEdge<=5.0,id+' not perched at the hairline');
 }
});

test('patrol cap has low wrap and one thick bill anchored to its forehead',()=>{
 const v=headwearCuboidVolumes('patrol-cap');
 assert.equal(v.length,10,'three visual forms assembled as hollow shell and anchored bill');
 const crown=by(v,'patrol-integrated-crown'),bill=by(v,'patrol-anchored-bill');
 assert.ok(crown&&bill);
 assert.ok(bill.height>=.7&&bill.depth>=2.7&&bill.depth<=3.0,
  'short, substantial military bill rather than an extended shelf');
 assert.ok(M['patrol-cap'].foreheadEdge<A.hairline);
 assert.ok(M['patrol-cap'].frontExtent<-7);
 assert.ok(M['patrol-cap'].rearExtent<5);
 assert.ok(lower(v,0,-4.4)<5);
});

test('boonie brim is a wide continuous RING at the fitted brow height',()=>{
 const v=headwearCuboidVolumes('boonie');
 assert.equal(v.length,13);
 const c=by(v,'boonie-integrated-crown');
 const f=by(v,'boonie-front-brim');
 const b=by(v,'boonie-rear-brim');
 const l=by(v,'boonie-left-brim');
 const right=by(v,'boonie-right-brim');
 assert.ok(c&&f&&b&&l&&right);
 assert.ok(f.width-c.width>3.8);
 assert.ok(bounds(v).maxX>6&&bounds(v).minX<-6);
 assert.ok(!covering(v,0,5,0),'brim MUST leave central face/head hole');
 for(const z of [-5.5,5.5])
  assert.ok(covering(v,0,5,z),'front/rear brim continuous');
 for(const x of [-5.5,5.5])
  assert.ok(covering(v,x,5,0),'side brim continuous');
 assert.ok(M.boonie.earEdge<5);
});

test('beanie has full-height fitted sides plus exactly one bold folded cuff',()=>{
 const v=headwearCuboidVolumes('beanie');
 assert.equal(v.length,9);
 const cuff=by(v,'beanie-front-cuff'),body=by(v,'beanie-front-body');
 assert.ok(cuff&&body);
 assert.ok(cuff.height>=1.3);
 assert.ok(cuff.z-cuff.depth/2<body.z-body.depth/2);
 assert.ok(lower(v,4.4,0)<A.earTop,'cuff reaches upper ear');
 assert.ok(bounds(v).maxX<5.2,'fitted, not helmet wide');
 assert.ok(!covering(v,0,4.5,0),'no giant face-occluding slab');
});

test('Stage 1L-A beanie has exactly TWO visible contour levels: crown and cuff',()=>{
 const v=headwearCuboidVolumes('beanie');
 const crown=by(v,'beanie-fitted-crown'),front=by(v,'beanie-front-body');
 const side=by(v,'beanie-right-body'),cuff=by(v,'beanie-right-cuff');
 const cuffFront=by(v,'beanie-front-cuff');
 assert.ok(crown&&front&&side&&cuff&&cuffFront);
 // There is no third tier at the crown/sidewall joint.
 assert.equal(front.width,crown.width);
 assert.ok(Math.abs(side.x+side.width/2-crown.width/2)<1e-6);
 assert.ok(Math.abs(front.z-front.depth/2+crown.depth/2)<1e-6);
 // The ONLY perimeter expansion is the single, physically meaningful fold.
 assert.ok(cuff.x+cuff.width/2>side.x+side.width/2+.25);
 assert.ok(cuff.x+cuff.width/2<side.x+side.width/2+.40);
 assert.ok(cuffFront.z-cuffFront.depth/2<front.z-front.depth/2-.25);
 const outerXAtY=y=>Math.max(...v.filter(p=>Math.abs(y-p.y)<p.height/2-1e-5)
  .map(p=>p.x+p.width/2));
 const frontZAtY=y=>Math.min(...v.filter(p=>Math.abs(y-p.y)<p.height/2-1e-5)
  .map(p=>p.z-p.depth/2));
 for(const y of [8.1,7.6,6.9,5.7]){
  assert.ok(Math.abs(outerXAtY(y)-4.60)<1e-6,
   'one unbroken crown profile from top to actual fold');
  assert.ok(Math.abs(frontZAtY(y)+4.70)<1e-6,
   'no little horizontal ledge above the cuff');
 }
 assert.ok(Math.abs(outerXAtY(4.5)-4.90)<1e-6);
 assert.ok(Math.abs(frontZAtY(4.5)+5.00)<1e-6);
 assert.ok(!covering(v,0,4.5,0),'fold remains hollow around the head');
 assert.ok(!covering(v,0,4.3,-3.5),'face is not filled by a crown slab');
 assert.ok(Math.abs(bounds(v).maxY-8.475)<1e-6);
 assert.ok(Math.abs(M.beanie.earEdge-3.745)<1e-6);
 assert.ok(cuff.height>=2.0,'the knitted fold is intentionally taller');
});

test('PASGT front peak and deep skirt differentiate it from protected ACH',()=>{
 const v=headwearCuboidVolumes('pasgt'),ach=headwearCuboidVolumes('ach');
 assert.equal(v.length,7);
 assert.ok(by(v,'pasgt-integrated-front-peak'));
 assert.ok(by(v,'pasgt-left-ear-lobe'));
 assert.ok(bounds(v).minZ<bounds(ach).minZ-.4,
  'PASGT front peak must project beyond ACH');
 assert.ok(lower(v,0,-5)<lower(ach,0,-5)-.3,
  'PASGT eyebrow-level brow is lower than ACH');
 assert.ok(lower(v,4.4,0)<lower(ach,4.4,0)-.3,
  'PASGT ear lobes descend below ACH');
 assert.ok(lower(v,0,5)<lower(ach,0,5)-.3,
  'PASGT deep rear nape');
 assert.ok(!covering(v,0,4.3,-3.5),'PASGT must expose face');
});

test('SSh-40 is a single deep steel pot with a subtle INTEGRATED lower flare',()=>{
 const v=headwearCuboidVolumes('soviet-steel');
 assert.equal(v.length,9);
 const crown=by(v,'ssh40-main-dome'),side=by(v,'ssh40-bowl-right');
 const rim=by(v,'ssh40-integrated-right-edge');
 const front=by(v,'ssh40-integrated-front-edge');
 assert.ok(crown&&side&&rim&&front);
 // ONE dome-to-bowl step, ONE restrained shell-edge flare. No shelves.
 const crownOuter=crown.width/2,bodyOuter=side.x+side.width/2;
 const rimOuter=rim.x+rim.width/2;
 assert.ok(bodyOuter-crownOuter>.35&&bodyOuter-crownOuter<.5);
 assert.ok(rimOuter-bodyOuter>.25&&rimOuter-bodyOuter<.4,
  'lower flare must never become an umbrella/kettle brim');
 assert.ok(front.depth<1.2,'not a broad floating frontal visor');
 assert.ok(lower(v,4.5,0)<A.brow,'steel shell hangs over ear region');
 assert.ok(M['soviet-steel'].foreheadEdge>A.earTop);
 assert.ok(!covering(v,0,4.3,0),'steel interior is hollow');
 assert.ok(!covering(v,0,5.0,-3.5),'front of face stays open');
 assert.ok(bounds(v).maxX<5.5,'outer width remains a fitted steel pot');
 assert.ok(bounds(v).minZ> -5.7,'short shell lip, not kettle brim');
});

test('Stage 1L model contours expose only purposeful mass transitions',()=>{
 const boundsXAt=(id,y)=>{
  const active=headwearCuboidVolumes(id).filter(p=>
   Math.abs(p.y-y)<p.height/2-1e-5);
  return Math.max(...active.map(p=>p.x+p.width/2));
 };
 // Patrol: one crown size, one band enlargement, no crown trim.
 for(const y of [7.7,7.0,6.4])assert.ok(Math.abs(boundsXAt('patrol-cap',y)-4.43)<1e-6);
 assert.ok(Math.abs(boundsXAt('patrol-cap',5.0)-4.80)<1e-6);
 // Boonie: deep fitted crown, ONE wider band, ONE wide brim.
 for(const y of [7.7,7.0,6.4])assert.ok(Math.abs(boundsXAt('boonie',y)-4.35)<1e-6);
 assert.ok(Math.abs(boundsXAt('boonie',5.4)-4.65)<1e-6);
 assert.ok(Math.abs(boundsXAt('boonie',4.85)-6.725)<1e-6);
 // Beanie: taller knitted upper cap; still only crown + cuff.
 assert.ok(Math.abs(boundsXAt('beanie',8.1)-4.60)<1e-6);
 assert.ok(Math.abs(boundsXAt('beanie',6.1)-4.60)<1e-6);
 assert.ok(Math.abs(boundsXAt('beanie',5.7)-4.90)<1e-6,
  'taller cuff begins higher without adding a third crown tier');
 assert.ok(Math.abs(boundsXAt('beanie',4.5)-4.90)<1e-6);
});

test('Stage 1M taller fabric bands and cuff keep only intentional form changes',()=>{
 const patrol=headwearCuboidVolumes('patrol-cap');
 const boonie=headwearCuboidVolumes('boonie');
 const beanie=headwearCuboidVolumes('beanie');
 const b=(v,n)=>by(v,n);
 for(const name of ['patrol-front-band','patrol-rear-band','patrol-left-band','patrol-right-band']){
  const part=b(patrol,name);
  assert.ok(part&&Math.abs(part.height-1.38)<1e-6,'patrol band is a single taller ring');
  assert.ok(Math.abs(part.y+part.height/2-6.02)<1e-6);
 }
 for(const name of ['boonie-front-band','boonie-rear-band','boonie-left-band','boonie-right-band']){
  const part=b(boonie,name);
  assert.ok(part&&Math.abs(part.height-1.54)<1e-6,'boonie band is one taller ring');
  assert.ok(Math.abs(part.y+part.height/2-6.08)<1e-6);
 }
 for(const name of ['beanie-front-cuff','beanie-rear-cuff','beanie-left-cuff','beanie-right-cuff']){
  const part=b(beanie,name);
  assert.ok(part&&Math.abs(part.height-2.09)<1e-6,'the watch cap has ONE taller cuff');
  assert.ok(Math.abs(part.y+part.height/2-5.835)<1e-6);
 }
 // The user-approved fits and head cavity stay unchanged at the lower rim.
 assert.ok(Math.abs(lower(patrol,4.5,0)-4.64)<1e-6);
 assert.ok(Math.abs(lower(boonie,4.5,0)-4.54)<1e-6);
 assert.ok(Math.abs(lower(beanie,4.5,0)-3.745)<1e-6);
 for(const [id,v] of [['patrol-cap',patrol],['boonie',boonie],['beanie',beanie]]){
  assert.ok(!covering(v,0,4.3,-3),id+' lower head/face space is open');
 }
});

test('Stage 1M PASGT brow has no arbitrary fraction-sized side and rear join notches',()=>{
 const v=headwearCuboidVolumes('pasgt');
 const crown=by(v,'pasgt-single-protective-crown');
 const temple=by(v,'pasgt-right-temple');
 const lobe=by(v,'pasgt-right-ear-lobe');
 const rear=by(v,'pasgt-low-rear-skirt');
 assert.ok(crown&&temple&&lobe&&rear);
 assert.ok(Math.abs(temple.z-temple.depth/2-(crown.z-crown.depth/2))<1e-6,
  'temple front aligns precisely to shell face rather than creating a 0.1-unit spur');
 assert.ok(Math.abs(rear.y+rear.height/2-(lobe.y+lobe.height/2))<1e-6,
  'ear/skirt share their upper edge instead of a 0.03-unit line');
 assert.ok(M.pasgt.foreheadEdge< M.ach.foreheadEdge);
 assert.ok(M.pasgt.earEdge< M.ach.earEdge);
});

test('Stage 1M steel rim is thicker and one aligned joined perimeter',()=>{
 const v=headwearCuboidVolumes('soviet-steel');
 const names=['ssh40-integrated-front-edge','ssh40-integrated-rear-edge',
  'ssh40-integrated-left-edge','ssh40-integrated-right-edge'];
 const rim=names.map(n=>by(v,n));
 assert.ok(rim.every(Boolean));
 for(const p of rim){
  assert.ok(Math.abs(p.y-4.30)<1e-6);
  assert.ok(Math.abs(p.height-1.10)<1e-6);
 }
 const front=rim[0],rear=rim[1],left=rim[2],right=rim[3];
 assert.ok(Math.abs(front.width/2-(right.x+right.width/2))<1e-6,
  'side and front rim line up in X; no 0.005-unit corner spurs');
 assert.ok(Math.abs(rear.width/2-(-left.x+left.width/2))<1e-6);
 assert.ok(Math.abs(front.z-front.depth/2+(right.depth/2))<1e-6,
  'front and side rim outer Z aligns exactly');
 assert.ok(Math.abs(rear.z+rear.depth/2-right.depth/2)<1e-6);
 assert.ok(M['soviet-steel'].earEdge>=3.7 && M['soviet-steel'].foreheadEdge>=3.7);
});

test('all wardrobe choices use canonical silhouette rendering in both lab and battle',()=>{
 const source=readFileSync(new URL('../src/operator-wardrobe-head-visuals.ts',import.meta.url),'utf8');
 assert.match(source,/g\(headwear,id,true\)\.add\(createHeadwearSilhouette\(id,silhouetteMaterial\)\)/);
 for(const legacy of ["helmet('pasgt'","const beanie=g(headwear",
  "const boonie=g(headwear","const steel=g(headwear"])
  assert.ok(!source.includes(legacy),'old placeholder is absent: '+legacy);
});
