import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readWardrobe,initialWardrobe}
 from '../src/operator-wardrobe-data.ts';
import {createWardrobeHeadLayers,updateWardrobeHeadLayers}
 from '../src/operator-wardrobe-head-visuals.ts';
import {M1_FIT_LANDMARKS,m1SurfacePoint} from '../src/operator-m1-helmet-profile.ts';
import {m1RetentionPath,m1RetentionAllowed} from '../src/operator-m1-retention.ts';
import {createPasgtRetentionGeometry} from '../src/operator-pasgt-field-dress.ts';
import {achMichRetentionPaths} from '../src/operator-ach-mich-details.ts';
import {
 createSsh40RetentionLayers,updateSsh40RetentionLayers,
 ssh40RetentionPath,ssh40RetentionAllowed,
 readSsh40Chinstrap,SSH40_CHINSTRAP_WIDTH,
 SSH40_RETENTION_ANCHOR
} from '../src/operator-ssh40-retention.ts';
import {SSH40_STEEL_LEVELS,SSH40_FIT_LANDMARKS}
 from '../src/operator-ssh40-helmet-profile.ts';
import {readHelmetCoverConfig} from '../src/operator-helmet-cover-policy.ts';
import {readFileSync} from 'node:fs';

const insideHead=(p:readonly number[],margin=0)=>
 Math.abs(p[0])<4+margin&&p[2]>-4-margin&&p[2]<4+margin&&
 p[1]>-1-margin&&p[1]<7+margin;
const near=(a:number,b:number)=>Math.abs(a-b)<.00001;

test('B2-B adapts the PROVEN M1/PASGT and ACH/MICH head clearances',()=>{
 const ach=achMichRetentionPaths('ach');
 const pasgt=createPasgtRetentionGeometry();
 assert.equal(pasgt.userData.pasgtSimpleTwoPointRetention,true);
 for(const sign of [-1,1] as const){
  const route=ssh40RetentionPath(sign,'fastened');
  const approved=m1RetentionPath(sign,'fastened');
  const trusted=ach[sign<0?2:5];
  assert.equal(route.length,5);
  assert.deepEqual(route.slice(1),approved.slice(1),
   'all below-shell stations re-use approved M1 path, not guessed coordinates');
  assert.deepEqual(route[2],trusted[1],
   'cheek turn is the proven ACH/MICH outboard station');
  assert.deepEqual(route[3],trusted[2],
   'chin descends via the proven ACH/MICH point');
  assert.deepEqual(route[1],[sign*4.99,3.30,-1.12],
   'PASGT upper webbing station, no new cheek guess');
  assert.deepEqual(route[0],[sign*SSH40_RETENTION_ANCHOR[0],
   SSH40_RETENTION_ANCHOR[1],SSH40_RETENTION_ANCHOR[2]]);
  assert.ok(Math.abs(route[0][0])<Math.abs(M1_FIT_LANDMARKS.chinstrapRight[0]),
   'Soviet upper anchors sit under its smaller rolled lip');
  assert.ok(route[0][1]>SSH40_FIT_LANDMARKS.sideHem,
   'side anchor tucks inside the edge rather than floating beneath it');
  assert.equal(SSH40_STEEL_LEVELS[0].y,9.65,
   'approved boxy SSh-40 crown remains unchanged');
  assert.equal(m1SurfacePoint('steel',0,0)[1],10.24,
   'the approved M1 roof remains unchanged');
 }
});

test('B2-B two canvas states are cached and exclusive; masks hide, not erase',()=>{
 const host=new THREE.Group(),layers=createSsh40RetentionLayers(host);
 assert.equal(host.children.length,2);
 for(const [name,g] of [['fastened',layers.fastened],['unfastened',layers.unfastened]]){
  assert.equal(g.visible,false);
  assert.equal(g.children.length,4,'two side tabs, webbing, one slip buckle');
  const geo=g.children[0].geometry;
  assert.equal(geo.userData.ssh40TwoPieceCanvas,true);
  assert.equal(geo.userData.ssh40HasChinCup,false);
  assert.equal(geo.userData.ssh40Unfastened,name==='unfastened');
  assert.equal(geo.userData.ssh40ProvenJawClearance,true);
  assert.equal(geo.userData.ssh40ChinstrapRevision,1);
  assert.ok(geo.getAttribute('position').count<=60,'lean ribbon panels only');
  assert.equal(g.children.filter(x=>x.name==='ssh40-period-slip-buckle').length,1);
  assert.equal(g.children.filter(x=>x.name==='ssh40-side-ring-tab').length,2);
 }
 updateSsh40RetentionLayers(layers,undefined,'face-none');
 assert.equal(layers.fastened.visible,true);
 assert.equal(layers.unfastened.visible,false);
 updateSsh40RetentionLayers(layers,'unfastened','face-none');
 assert.equal(layers.fastened.visible,false);
 assert.equal(layers.unfastened.visible,true);
 updateSsh40RetentionLayers(layers,'unfastened','gas-m40');
 assert.equal(layers.fastened.visible,false);
 assert.equal(layers.unfastened.visible,false);
 updateSsh40RetentionLayers(layers,'fastened','face-none');
 assert.equal(layers.fastened.visible,true);
 assert.equal(readSsh40Chinstrap('obsolete-state'),'fastened');
 assert.equal(ssh40RetentionAllowed('gas-gp5'),false);
 assert.equal(ssh40RetentionAllowed('bandana'),false);
 assert.equal(m1RetentionAllowed('bandana'),false);
});

test('B2-B canvas geometry and centerlines never intersect the cube head',()=>{
 for(const mode of ['fastened','unfastened'] as const){
  const root=new THREE.Group(),layers=createSsh40RetentionLayers(root);
  const g=layers[mode].children[0].geometry,p=g.getAttribute('position');
  assert.equal(SSH40_CHINSTRAP_WIDTH,.76);
  for(let i=0;i<p.count;i++){
   const v=[p.getX(i),p.getY(i),p.getZ(i)];
   assert.ok(!insideHead(v,.035),
    `canvas triangle vertex ${i} must clear head: ${v.join(',')}`);
  }
  for(const sign of [-1,1] as const){
   const route=ssh40RetentionPath(sign,mode);
   assert.ok(route.length>=4);
   for(let j=1;j<route.length;j++)for(let n=0;n<=32;n++){
    const t=n/32,point=route[j-1].map((x,k)=>x+
     (route[j][k]-x)*t);
    assert.ok(!insideHead(point,.045),
     `SSh strap clips skull at mode ${mode}, side ${sign}, segment ${j}, sample ${n}: ${point}`);
   }
  }
  assert.equal(g.userData.ssh40Unfastened,mode==='unfastened');
  const buckle=layers[mode].children.find(x=>x.name==='ssh40-period-slip-buckle');
  assert.ok(buckle&&buckle.position.z<-4.3||mode==='unfastened',
   'the fastened slip buckle must sit below/outside the chin');
 }
});

test('B2-B SSh state is saved independently of M1 in existing wardrobe schema',()=>{
 const old=initialWardrobe();
 const saved=readWardrobe({...old,
  ssh40Chinstrap:'unfastened',m1Chinstrap:'fastened',
  styles:{...old.styles,headwear:'soviet-steel'}});
 assert.equal(saved.ssh40Chinstrap,'unfastened');
 assert.equal(saved.m1Chinstrap,'fastened');
 assert.equal(readWardrobe(saved).ssh40Chinstrap,'unfastened');
 assert.equal(readHelmetCoverConfig(saved).ssh40Chinstrap,'unfastened');
 assert.equal(readHelmetCoverConfig({ssh40Chinstrap:'bad'}).ssh40Chinstrap,undefined);
 assert.equal(readSsh40Chinstrap(undefined),'fastened');
});

test('B2-B canonical wardrobe renders SSh only, without changing M1 retention',()=>{
 const root=new THREE.Group(),head=new THREE.Group();
 root.add(head);
 const mat=()=>new THREE.MeshStandardMaterial({color:0x77776e});
 const layers=createWardrobeHeadLayers(root,head,mat(),mat(),mat(),mat());
 assert.ok(layers.ssh40Retention);
 assert.ok(layers.m1Retention);
 const soviet=layers.headwear['soviet-steel'];
 assert.ok(soviet.children.includes(layers.ssh40Retention.fastened));
 assert.ok(soviet.children.includes(layers.ssh40Retention.unfastened));
 assert.ok(!layers.headwear['m1-steel'].children.includes(
  layers.ssh40Retention.fastened));
 updateWardrobeHeadLayers(layers,
  'soviet-steel','face-none','eyes-none','headset-none');
 assert.equal(layers.ssh40Retention.fastened.visible,true);
 assert.equal(layers.headwear['soviet-steel'].visible,true);
 updateWardrobeHeadLayers(layers,
  'm1-steel','face-none','eyes-none','headset-none',undefined,
  undefined,undefined,undefined,'right',{
   ssh40Chinstrap:'unfastened',m1Chinstrap:'fastened'});
 assert.equal(layers.headwear['soviet-steel'].visible,false);
 assert.equal(layers.m1Retention.fastened.visible,true);
 const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 assert.match(studio,/SSh-40 CHINSTRAP/);
 assert.match(studio,/ssh40Chinstrap:value as WardrobeOptions\['ssh40Chinstrap'\]/);
});
