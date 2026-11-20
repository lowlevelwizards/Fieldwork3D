import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {M9_APPEARANCE_REFERENCES,M9_ART,m9ArtSockets,
 buildM9Appearance,clearM9Appearance}
 from '../src/weapons/geometry/beretta-m9-silhouettes.ts';
import {buildGlockAppearance,clearGlockAppearance}
 from '../src/weapons/geometry/glock-family-silhouettes.ts';
import {SIDEARM_PREVIEW_REFERENCES,buildSidearmPreview,
 clearSidearmPreview} from '../src/weapons/geometry/sidearm-preview.ts';
import {readFileSync} from 'node:fs';

const bounds=g=>new THREE.Box3().setFromObject(g);
const count=g=>{
 let meshes=0,triangles=0;
 g.traverse(o=>{
  if(!(o instanceof THREE.Mesh))return;
  meshes++;triangles+=(o.geometry.index?.count??
   o.geometry.attributes.position.count)/3;
 });
 return {meshes,triangles};
};
const sideRay=(g,x,y)=>{
 const ray=new THREE.Raycaster(new THREE.Vector3(x,y,9),
  new THREE.Vector3(0,0,-1),0,20);
 return ray.intersectObject(g,true).length;
};

test('M9 family: two genuinely 3D art-only models, not issued Glock IDs',()=>{
 assert.equal(M9_APPEARANCE_REFERENCES.length,2);
 assert.equal(SIDEARM_PREVIEW_REFERENCES.length,6);
 assert.ok(!M9_APPEARANCE_REFERENCES.some(r=>r.id.startsWith('glock')));
 const source=readFileSync(new URL('../src/secondary-equipment.ts',import.meta.url),'utf8');
 assert.doesNotMatch(source,/beretta-m9/);
 for(const ref of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(ref.id);
  try{
   assert.equal(m.userData.appearanceOnly,true);
   assert.equal(m.userData.m9Appearance,ref.id);
   assert.equal(m.children.filter(x=>x.userData.m9MovingSlide).length,1);
   assert.equal(m.children.filter(x=>x.userData.m9ExposedBarrel).length,1);
   assert.equal(m.children.filter(x=>x.userData.m9OpenSlideRail).length,2);
   assert.equal(m.children.filter(x=>x.userData.m9OpenGuard).length,1);
   assert.equal(m.children.filter(x=>x.userData.m9Hammer).length,1);
   assert.equal(m.children.filter(x=>x.userData.m9MagazineFloorplate).length,1);
   assert.ok(m.children.every(x=>x.name.startsWith('family-')));
   const stats=count(m);
   const isA3=ref.id==='beretta-m9a3';
   assert.ok(stats.meshes<=(isA3?18:17),
     'D6 provisional reduced mesh budget '+JSON.stringify(stats));
   assert.ok(stats.triangles<=(isA3?380:365),
     'D6 provisional reduced triangle budget '+JSON.stringify(stats));
   console.log('BERETTA_D6_ART_BUDGET '+JSON.stringify({id:ref.id,...stats}));
    }finally{
   clearM9Appearance(m);
   assert.equal(m.children.length,0);
  }
 }
});

test('M9 negative spaces: guard truly open and forward upper unroofed',()=>{
 for(const ref of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(ref.id,{monochrome:true});
  try{
   assert.equal(sideRay(m,-.3,-2.4),0,'physical aperture');
   assert.ok(sideRay(m,1.45,-2.55)>0,'front pillar');
   assert.ok(sideRay(m,-.4,-3.52)>0,'lower guard');
   assert.equal(sideRay(m,4.4,3.63),0,
    'upper does not have a fictitious full-width roof');
   assert.ok(sideRay(m,-5.0,2.4)>0,'rear slide solid');
   const frame=m.children.find(x=>x.userData.m9IntegratedFrame);
   const slide=m.children.find(x=>x.userData.m9MovingSlide);
   assert.ok(bounds(frame).intersectsBox(bounds(slide)));
   const b=bounds(m),depth=b.max.z-b.min.z;
   assert.ok(depth>=3.0&&depth<=3.4,'substantial but restrained Beretta upper');
  }finally{clearM9Appearance(m);}
 }
});

test('M9A3 silhouette differs through real shape, not FDE only',()=>{
 const m9=buildM9Appearance('beretta-m9');
 const a3=buildM9Appearance('beretta-m9a3');
 const glock=buildGlockAppearance('glock-g19-gen3');
 try{
  const a=bounds(m9),b=bounds(a3),g=bounds(glock);
  assert.ok(a.max.x>g.max.x+.7,'M9 longer than reference Glock');
  assert.ok(b.max.x>a.max.x+.45,'A3 muzzle length is real geometry');
  assert.ok(b.max.y<=a.max.y+.1);
  assert.ok(M9_ART['beretta-m9a3'].straightGrip);
  assert.ok(!M9_ART['beretta-m9'].straightGrip);
  assert.equal(m9.children.filter(x=>x.userData.m9AccessoryRail).length,0);
  assert.equal(a3.children.filter(x=>x.userData.m9AccessoryRail).length,1);
  const a3rail=a3.children.find(x=>x.userData.m9AccessoryRail);
  const a3frame=a3.children.find(x=>x.userData.m9IntegratedFrame);
  assert.ok(bounds(a3rail).intersectsBox(bounds(a3frame)),
   'M9A3 accessory rail must actually meet lower frame');
  assert.ok(bounds(a3rail).max.x<=bounds(a3frame).max.x-.3,
   'accessory rail must not float beyond the dust-cover nose');
  assert.ok(m9ArtSockets('beretta-m9a3').muzzle.x>
   m9ArtSockets('beretta-m9').muzzle.x);
  assert.equal(m9.userData.m9ArtLandmarks.actualOpenTop,true);
 }finally{
  clearM9Appearance(m9);clearM9Appearance(a3);clearGlockAppearance(glock);
 }
});

test('shared preview accepts Beretta but leaves Glock equipment unchanged',()=>{
 for(const ref of SIDEARM_PREVIEW_REFERENCES){
  const preview=buildSidearmPreview(ref.id,{monochrome:true});
  assert.equal(preview.userData.appearanceOnly,true);
  clearSidearmPreview(ref.id,preview);
  assert.equal(preview.children.length,0);
 }
 const gallery=readFileSync(new URL('../src/arsenal/glock-gallery.ts',import.meta.url),'utf8');
 assert.match(gallery,/buildSidearmPreview/);
 assert.match(gallery,/openM9Inspector/);
 assert.match(gallery,/BERETTA/);
 assert.doesNotMatch(gallery,/equipFreshSecondary/);
});

test('C1 caricature: the exposed round barrel is a real visible object, not a painted beam',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const barrels=m.children.filter(x=>x.userData.m9ExposedBarrel);
   const sideRails=m.children.filter(x=>x.userData.m9OpenSlideRail);
   assert.equal(barrels.length,1);
   assert.equal(sideRails.length,2);
   const barrel=bounds(barrels[0]);
   const rail=bounds(sideRails[0]);
   assert.ok(barrel.max.y>rail.max.y+.9,
    'barrel protrudes substantially above low side rails');
   assert.ok(barrel.max.y-barrel.min.y>1.2,
    'barrel diameter remains visibly chunky');
   assert.ok(sideRay(m,4.4,2.8)>0,'barrel physically visible from side');
   assert.equal(sideRay(m,4.4,3.42),0,'real opening above barrel');
   assert.ok(m.children.some(x=>x.userData.m9MuzzleCrown));
   const frame=m.children.find(x=>x.userData.m9IntegratedFrame);
   assert.ok(bounds(frame).max.x<M9_ART[id].nose-1.1,
    'shorter dust cover exposes muzzle and no full-length lower slab');
  }finally{clearM9Appearance(m);}
 }
});

test('C1 caricature: grip is swept and broad; classic curvature differs from Vertec',()=>{
 const classic=M9_ART['beretta-m9'],a3=M9_ART['beretta-m9a3'];
 assert.ok(classic.gripRear<a3.gripRear-.5,'classic heel extends rearward');
 assert.ok(classic.gripFront<a3.gripFront-.1,'fuller classic heel');
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const panels=m.children.filter(x=>x.userData.m9GripPanel);
   assert.equal(panels.length,1,'two planar panels batched in one mesh');
   assert.ok(panels.every(p=>bounds(p).max.y>=-2.25&&bounds(p).max.y<=-2.0),
    'grip panels sit high while following swept frame');
   assert.equal(m.children.filter(x=>x.userData.m9DecockerBatched).length,1,
    'two large safety paddles share dark slide detail batch');
   assert.ok(sideRay(m,-.3,-2.30)===0,
    'larger sculpted trigger guard remains physically empty');
  }finally{clearM9Appearance(m);}
 }
});

test('C2 Beretta inspector is mobile-first and scoped away from Glock loadouts',()=>{
 const inspector=readFileSync(new URL('../src/arsenal/m9-inspector.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/arsenal/arsenal.css',import.meta.url),'utf8');
 assert.match(inspector,/arsenal-m9-inspector/);
 assert.match(inspector,/aria-pressed/);
 assert.match(inspector,/VISUAL STUDY ONLY/);
 assert.match(inspector,/viewport\.top\(\)/);
 assert.match(inspector,/viewport\.useTightArtFraming\(\)/);
 assert.match(inspector,/viewport\.quarter\(\)/);
 assert.doesNotMatch(inspector,/equipFreshSecondary|secondaryRoundTotal|saveGlockLibrary/);
 assert.match(css,/\.arsenal-m9-inspector \.arsenal-wb-main/);
 assert.match(css,/\.arsenal-m9-inspector \.glock-wb-viewport\{height:100%\}/);
});

test('D4 silhouette: SHORT forward-angled serrations, thicker exposed barrel and connected heel',()=>{
 const oldRadius=.70;
 const m=M9_ART['beretta-m9'],a=M9_ART['beretta-m9a3'];
 assert.ok(m.gripRear<-10.0,'classic M9 broad swept heel');
 assert.ok(a.gripRear>-9.5,'Vertec heel stays more upright');
 assert.ok(m.gripRear<a.gripRear-.65,'variant backstraps differ by actual art coordinates');
 assert.ok(m.gripFront<a.gripFront-.30,'classic grip extends further aft');
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const g=buildM9Appearance(id);
  try{
   const landmarks=g.userData.m9ArtLandmarks;
   assert.ok(landmarks.barrelRadius>=oldRadius*1.40,
    'exposed barrel is visibly wider than D2, not merely a material change');
   const barrel=g.children.find(x=>x.userData.m9ExposedBarrel);
   const sideRail=g.children.find(x=>x.userData.m9OpenSlideRail);
   assert.ok(bounds(barrel).max.y-bounds(sideRail).max.y>1.5,
    'barrel clears low open rails on both sides');
   const serrations=g.children.filter(x=>x.userData.m9SerrationBatch);
   assert.equal(serrations.length,1,'serrations stay one shared indexed draw batch');
   const attr=serrations[0].geometry.getAttribute('position');
   let bottom=Infinity,top=-Infinity;
   for(let i=0;i<attr.count;i++){
    bottom=Math.min(bottom,attr.getY(i));top=Math.max(top,attr.getY(i));
   }
   assert.ok(top-bottom>=1.25&&top-bottom<=1.55,'serrations are bold but shorter than slide height');
   assert.ok(bottom>=.65&&bottom<=.75,'D5 serrations move down onto lower skirt');
   assert.ok(top<=landmarks.lowerSlideTopY-.10,
    'short slanted grooves remain within the taller lower slide');
   assert.equal(serrations[0].geometry.index.count,54,
    'three serrations and two safety paddles in one indexed batch');
   assert.ok(sideRay(g,-.25,-2.35)===0,
    'large, rounded trigger guard retains authentic physical opening');
   assert.ok(g.children.some(x=>x.userData.m9MuzzleCrown));
   assert.equal(g.userData.appearanceOnly,true);
  }finally{clearM9Appearance(g);}
 }
});

test('D4 rear bridge is physically longer, narrower and angled above the broad skirt',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const upper=m.children.find(x=>x.userData.m9NarrowUpperBridge);
   const skirt=m.children.find(x=>x.userData.m9BroadLowerSlide);
   assert.ok(upper&&skirt,'two authored volumes, not one generic extrusion');
   const ub=bounds(upper),lb=bounds(skirt),lm=m.userData.m9ArtLandmarks;
   assert.ok(ub.max.x>=-1.3,'upper extends to the trigger zone');
   assert.ok(lb.max.z-lb.min.z>ub.max.z-ub.min.z+.4,
    'upper is visibly thinner across the top/three-quarter view');
   assert.ok(lm.beavertailRearX<-11,'rear tang projects beyond hammer and Glock rear');
   const frame=m.children.find(x=>x.userData.m9IntegratedFrame);
   assert.ok(bounds(frame).min.x<=-11,'long tang is part of connected frame');
  }finally{clearM9Appearance(m);}
 }
});

test('D4 muzzle U-wrap is physically open, carries sight and exposes projecting barrel',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const a=M9_ART[id],wrap=m.children.filter(x=>x.userData.m9FrontUWrap);
   assert.equal(wrap.length,1,'one continuous sculpted front muzzle U-wrap');
   const b=bounds(wrap[0]),barrel=m.children.find(x=>x.userData.m9ExposedBarrel);
   assert.ok(b.max.x<a.barrelEnd-.20,'barrel visibly projects past slide nose');
   assert.ok(sideRay(m,4.4,2.8)>0,'exposed barrel shows behind front shell');
   assert.ok(b.max.z-b.min.z>=3.10,'true three-dimensional muzzle cheeks');
   assert.equal(sideRay(m,4.4,3.63),0,'no cosmetic full-width slide roof');
   const nose=m.children.filter(x=>x.userData.m9UnifiedNose);
   assert.equal(nose.length,1,'integrated front U-wrap and front sight');
   const sights=m.children.filter(x=>x.name.startsWith('family-barrel-')&&
    x.geometry.type==='BoxGeometry');
   assert.equal(sights.length,1,'rear sight is the only standalone sight box');
   }finally{clearM9Appearance(m);}
 }
});

test('D4 safety cues and magazine plate are attached, minimal and double-sided',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const dots=m.children.filter(x=>x.userData.m9RedSafetyDots);
   assert.equal(dots.length,1,'one batched red safety-mark mesh');
   assert.equal(dots[0].geometry.index.count,12,
    'two low-polygon red safety diamonds');
   assert.equal(m.children.filter(x=>x.userData.m9DecockerBatched).length,1);
   const plate=m.children.find(x=>x.userData.m9MagazineFloorplate);
   const frame=m.children.find(x=>x.userData.m9IntegratedFrame);
   assert.equal(plate.userData.m9HeelContact,true);
   assert.ok(bounds(plate).intersectsBox(bounds(frame)),
    'sloped magazine plate intersects grip without a gap');
   assert.ok(bounds(plate).min.y< M9_ART[id].heel-.25,
    'plate visibly extends below heel while seating against it');
   const clay=buildM9Appearance(id,{monochrome:true});
   try{assert.equal(clay.children.filter(x=>x.userData.m9RedSafetyDots).length,0);}
   finally{clearM9Appearance(clay);}
  }finally{clearM9Appearance(m);}
 }
});

test('D5 sculpted rear roof tapers inward while broad lower skirt carries marks',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const upper=m.children.find(x=>x.userData.m9NarrowUpperBridge);
   const skirt=m.children.find(x=>x.userData.m9BroadLowerSlide);
   assert.equal(upper.userData.m9TaperedRoof,true);
   const pos=upper.geometry.getAttribute('position'),roof=[],base=[];
   for(let i=0;i<pos.count;i++){
    const y=pos.getY(i),z=Math.abs(pos.getZ(i));
    if(Math.abs(y-3.17)<.005)roof.push(z);
    if(Math.abs(y-.34)<.005)base.push(z);
   }
   assert.ok(roof.length>1&&base.length>1);
   assert.ok(Math.max(...roof)<=Math.max(...base)*.88,
    'rear upper must have a visible taper, not uniform-depth extrusion');
   assert.ok(bounds(skirt).max.y>=2.15,
    'lower slide raised to carry all control details');
   const marks=m.children.find(x=>x.userData.m9SerrationBatch);
   const attr=marks.geometry.getAttribute('position');
   let minX=Infinity,maxY=-Infinity,minY=Infinity,minZ=Infinity;
   for(let i=0;i<attr.count;i++){
    minX=Math.min(minX,attr.getX(i));
    maxY=Math.max(maxY,attr.getY(i));
    minY=Math.min(minY,attr.getY(i));
    minZ=Math.min(minZ,Math.abs(attr.getZ(i)));
   }
   assert.ok(minX>=-9.0,'low band detail stays near the rear slide');
   assert.ok(maxY<=2.08&&minY>=.67,'lower slide marks, clear of roof');
   assert.ok(minZ>=1.53,'marks physically sit outside broad lower slide');
   const dots=m.children.find(x=>x.userData.m9RedSafetyDots);
   const dotAttr=dots.geometry.getAttribute('position');
   for(let i=0;i<dotAttr.count;i++){
    assert.ok(Math.abs(dotAttr.getZ(i))>=1.52,
     'red dot remains outside the lower slide');
    assert.ok(dotAttr.getY(i)<=1.30,'red safety dot lowered under paddle');
   }
   assert.equal(m.children.filter(x=>x.userData.m9DecockerCue).length,0);
   assert.equal(m.children.filter(x=>x.userData.m9DecockerBatched).length,1);
   }finally{clearM9Appearance(m);}
 }
});

test('D5 connected front wrap and longer rooted front sight retain open channel',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const wrap=m.children.find(x=>x.userData.m9FrontUWrap);
   const crown=m.children.find(x=>x.userData.m9FrontWrapCrown);
   const sight=m.children.find(x=>x.userData.m9AttachedFrontSight);
   assert.ok(wrap&&crown&&sight);
   assert.ok(bounds(wrap).max.x-bounds(wrap).min.x>=1.30,
    'front wrap must be substantial front-to-back, not two posts');
   assert.ok(bounds(wrap).intersectsBox(bounds(crown)),
    'front crown connects to the open U cheeks');
   assert.ok(bounds(crown).intersectsBox(bounds(sight)),
    'front sight physically roots into its nose mount');
   assert.equal(wrap,crown,'nose bridge shares the front shell mesh');
   assert.equal(wrap,sight,'front sight is integral to the nose shell');
   assert.ok(bounds(sight).max.x-bounds(sight).min.x>=1.30,
    'substantial front-to-back nose shell');
   assert.ok(bounds(wrap).max.x<M9_ART[id].barrelEnd-.20,
    'barrel continues through and beyond front wrap');
   assert.equal(sideRay(m,4.4,3.63),0,
    'open slide channel stays real behind front cap');
  }finally{clearM9Appearance(m);}
 }
});

test('D5 rear hammer is tall/slim and grip panels rake backwards',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const hammer=m.children.find(x=>x.userData.m9Hammer),b=bounds(hammer);
   assert.ok(b.max.y>=4.10&&b.max.y<=4.18,'chunky hooked hammer');
   assert.ok(b.max.x-b.min.x<.75,'slim side hook');
   assert.ok(b.max.z-b.min.z<=1.20,'narrow hammer in top view');
   const panels=m.children.filter(x=>x.userData.m9GripPanelBatch);
   assert.equal(panels.length,1,'two factory grip faces batched');
   const p=panels[0].geometry.getAttribute('position');
   const hi=new Set(),lo=new Set(),zs=new Set();
   for(let i=0;i<p.count;i++){
    if(p.getY(i)>-2.30)hi.add(p.getX(i).toFixed(3));
    if(p.getY(i)<-7.70)lo.add(p.getX(i).toFixed(3));
    zs.add(p.getZ(i).toFixed(3));
   }
   assert.ok(hi.size>=2&&lo.size>=2);
   assert.equal(zs.size,2,'flat panel faces, no hidden sidewalls');
   const avg=set=>[...set].map(Number).reduce((a,b)=>a+b,0)/set.size;
   assert.ok(avg(lo)<avg(hi)-.60,'authentic rear-swept grip panel');
   const source=readFileSync(new URL('../src/weapons/geometry/beretta-m9-silhouettes.ts',import.meta.url),'utf8');
   assert.doesNotMatch(source,/m9Trigger|addTriggerToM9/);
  }finally{clearM9Appearance(m);}
 }
});

test('D5 flat front dust cover and visible M9A3-only rail/control cues',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const m=buildM9Appearance(id);
  try{
   const frame=m.children.find(x=>x.userData.m9IntegratedFrame);
   const p=frame.geometry.getAttribute('position');
   const frameXs=[1.58,5.92].map(x=>{
    const ys=[];
    for(let i=0;i<p.count;i++)
     if(Math.abs(p.getX(i)-x)<.005&&p.getY(i)<0)ys.push(p.getY(i));
    return ys;
   });
   assert.ok(frameXs.every(x=>x.some(y=>Math.abs(y+.70)<.005)),
    'both dust cover underside stations must be level');
   assert.equal(m.children.filter(x=>x.userData.m9FrameControlBatch).length,0,
    'invisible micro-controls removed, not hidden');
   assert.equal(m.children.filter(x=>x.userData.m9RailSlots).length,0,
    'invisible rail slot marks removed');
   if(id==='beretta-m9a3'){
    const rail=m.children.find(x=>x.userData.m9AccessoryRail);
    assert.ok(bounds(rail).min.y<-.99,'M9A3 rail silhouette still projects');
   }
   }finally{clearM9Appearance(m);}
 }
});

test('D6 all Arsenal sidearm thumbnails, hero, and inspectors initialize side-on',()=>{
 const gallery=readFileSync(new URL('../src/arsenal/glock-gallery.ts',import.meta.url),'utf8');
 const viewport=readFileSync(new URL('../src/arsenal/glock-viewport.ts',import.meta.url),'utf8');
 const inspector=readFileSync(new URL('../src/arsenal/m9-inspector.ts',import.meta.url),'utf8');
 const primary=readFileSync(new URL('../src/arsenal/thumbnailer.ts',import.meta.url),'utf8');
 assert.match(gallery,/camera\.position\.set\(center\.x,center\.y,center\.z\+distance\)/);
 assert.doesNotMatch(gallery,/isCard\?0:distance/);
 assert.match(viewport,/private yaw=0;/);
 assert.match(viewport,/private pitch=0;/);
 assert.match(viewport,/reset\(\)\{this\.yaw=0;this\.pitch=0;/);
 assert.match(inspector,/viewport\.useTightArtFraming\(\);viewport\.side\(\)/);
 assert.match(inspector,/String\(button===side\)/);
 assert.match(primary,/this\.camera\.position\.set\(center\.x,center\.y,distance\)/);
});

test('D6 no redundant micro control or extruded sight geometry',()=>{
 for(const {id} of M9_APPEARANCE_REFERENCES){
  const g=buildM9Appearance(id);
  try{
   assert.equal(g.children.filter(x=>x.userData.m9UnifiedNose).length,1);
   assert.equal(g.children.filter(x=>x.userData.m9FrontWrapCrown).length,1);
   assert.equal(g.children.filter(x=>x.userData.m9AttachedFrontSight).length,1);
   assert.equal(g.children.filter(x=>x.userData.m9FrameControlBatch).length,0);
   assert.equal(g.children.filter(x=>x.userData.m9RailSlots).length,0);
   assert.equal(g.children.filter(x=>x.userData.m9DecockerCue).length,0);
   assert.equal(g.children.filter(x=>x.userData.m9DecockerBatched).length,1);
   const marks=g.children.find(x=>x.userData.m9SerrationBatch);
   assert.equal(marks.geometry.index.count,54);
   const panels=g.children.find(x=>x.userData.m9GripPanelBatch);
   assert.ok(panels);
   assert.equal(panels.geometry.index.count,18,
    'five-point panels, two sides, three triangles per side');
   const barrel=g.children.find(x=>x.userData.m9ExposedBarrel);
   assert.equal(barrel.geometry.type,'CylinderGeometry');
   const tip=g.children.find(x=>x.userData.m9MuzzleCrown);
   assert.equal(tip.geometry.index.count,18,
    'six-triangle flat muzzle face, no second capped tube');
   assert.equal(sideRay(g,4.4,3.63),0,'open slide unchanged');
   assert.equal(sideRay(g,-.3,-2.4),0,'guard physically open');
  }finally{clearM9Appearance(g);}
 }
});
