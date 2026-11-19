import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {initialWeaponConfiguration,selectWeaponFamilyPreset}
 from '../src/equipment-weapon-assemblies.ts';
import {buildWeaponSilhouette,clearWeaponSilhouette}
 from '../src/breach-weapon-geometry.ts';
import {validFamilyBuild,proposeFamilyPartChange}
 from '../src/equipment-weapon-families.ts';
import {riflePoseContacts} from '../src/breach-weapon-contact-zones.ts';
import {R870_PISTOL_GRIP,R870_REAR_JOIN,R870_REAR_PARTS}
 from '../src/weapons/geometry/r870-rear-p12.ts';

const preset=id=>selectWeaponFamilyPreset(initialWeaponConfiguration('shotgun'),id);
const bounds=mesh=>new THREE.Box3().setFromObject(mesh);
const near=(actual,expected,why)=>assert.ok(Math.abs(actual-expected)<.03,
 `${why}: ${actual} versus ${expected}`);
function contains(points,[px,py]){
 let inside=false;
 for(let i=0,j=points.length-1;i<points.length;j=i++){
  const [x,y]=points[i],[xx,yy]=points[j];
  if((y>py)!==(yy>py) && px<(xx-x)*(py-y)/(yy-y)+x)inside=!inside;
 }
 return inside;
}
function inspect(config,fn){
 const material=new THREE.MeshBasicMaterial();
 const root=buildWeaponSilhouette('shotgun',material,material,config);
 try{return fn(root)}finally{clearWeaponSilhouette(root);material.dispose()}
}

test('P16 pistol rear is a hand-sized near-vertical grip, never a long diagonal birdshead wedge',()=>{
 assert.equal(R870_PISTOL_GRIP.length,12,'single simple extruded polygon');
 assert.deepEqual(R870_PISTOL_GRIP[0],R870_REAR_JOIN.receiverTop);
 assert.deepEqual(R870_PISTOL_GRIP.at(-1),R870_REAR_JOIN.receiverBottom);
 const rearX=Math.min(...R870_PISTOL_GRIP.map(p=>p[0]));
 const bottomY=Math.min(...R870_PISTOL_GRIP.map(p=>p[1]));
 near(rearX,-9.54,'rear heel');
 near(bottomY,-5.19,'lower grip heel');
 assert.ok(Math.abs(rearX-R870_REAR_JOIN.receiverBottom[0])<3.6,
  'rear sweep remains shorter than former 4.84-unit wedge');
 assert.ok(Math.abs(bottomY-R870_REAR_JOIN.receiverBottom[1])>3.3,
  'vertical drop defines the pistol silhouette');
 assert.ok(contains(R870_PISTOL_GRIP,
  [R870_REAR_PARTS.pistol.primaryX,R870_REAR_PARTS.pistol.primaryY]),
  'primary-hand contact stays inside authored grip');
 near(R870_REAR_PARTS.pistol.stockX,rearX,'stockless rear datum tracks real heel');
});

test('P16 MCS Breacher pistol-only model has one compact polymer grip and no ghost butt',()=>{
 const config=preset('r870-mcs-breacher');
 assert.ok(validFamilyBuild(config.build,'shotgun'));
 inspect(config,root=>{
  const grip=root.children.filter(mesh=>mesh.name.startsWith('family-grip-'));
  const stock=root.children.filter(mesh=>mesh.name.startsWith('family-stock-'));
  assert.equal(grip.length,1);
  assert.equal(stock.length,0);
  assert.equal(root.userData.r870ShoulderStock,false);
  const b=bounds(grip[0]);
  near(b.min.x,-9.54,'rendered grip rear x');
  near(b.min.y,-5.19,'rendered grip bottom y');
  near(b.max.z-b.min.z,2.60,'rendered grip thickness');
 });
 const pose=riflePoseContacts('shotgun',config);
 assert.equal(pose.primary.x,R870_REAR_PARTS.pistol.primaryX);
 assert.equal(pose.primary.y,R870_REAR_PARTS.pistol.primaryY);
});

test('P16 MCS CQB uses the SAME pistol grip, with stock strut ending at socket, not crossing handle',()=>{
 const config=preset('r870-mcs-cqb');
 assert.ok(validFamilyBuild(config.build,'shotgun'));
 inspect(config,root=>{
  assert.equal(root.userData.r870ShoulderStock,true);
  const grip=root.children.filter(mesh=>mesh.name.startsWith('family-grip-'));
  const stock=root.children.filter(mesh=>mesh.name.startsWith('family-stock-'));
  assert.equal(grip.length,1,'one grip only');
  assert.equal(stock.length,3,'one rail + one lower strut + one pad');
  const b=bounds(grip[0]);
  near(b.min.x,-9.54,'same heel as stockless');
  near(b.min.y,-5.19,'same vertical grip as stockless');
  near(b.max.z-b.min.z,2.60,'same pistol grip thickness');
  const strut=stock[1],span=bounds(strut);
  assert.ok(span.max.x<-7.3 && span.max.x>-7.7,
   'strut terminates at grip socket, not forward across entire grip');
  assert.ok(span.max.y<-.9,'lower strut leaves large upper triangle open');
  near(bounds(root).min.x,-14.40,'unchanged real shouldering datum');
 });
 const wood=preset('r870-police-wood').build;
 const changed=proposeFamilyPartChange(wood,'shotgun','stock','r870-mcs-skeletal-stock');
 assert.equal(changed.valid,true);
 assert.equal(changed.build.parts.grip,'r870-pistol-grip');
 assert.equal(R870_REAR_PARTS.wood.stockX,-15.78,'approved full wood unchanged');
});
