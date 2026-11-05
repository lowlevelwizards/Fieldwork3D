import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2Mask} from '../src/operator-d2-mask-visuals.ts';
import {surfaceAt} from '../src/operator-d2-mask-r21-geometry.ts';

const mat=new THREE.MeshStandardMaterial({color:0x39433d});
const m={rubber:mat,hardware:mat,filters:mat,lens:mat};
const create=id=>createD2Mask(id,m);
const box=o=>new THREE.Box3().setFromObject(o);
const matches=(g,name)=>{const out=[];g.traverse(o=>{if(o.name===name)out.push(o)});return out;};

test('R21 M50 restores R13 notched upper and lower silhouette, no genuine openings',()=>{
 const g=create('gas-m50');
 const lens=g.getObjectByName('m50-one-piece-panoramic-visor-lens');
 assert.equal(matches(g,'m50-one-piece-panoramic-visor-lens').length,1);
 assert.equal(lens?.userData.d2ContouredPanorama,true);
 assert.equal(lens?.userData.d2NoseNotchRise,.5);
 assert.equal(lens.geometry.getAttribute('position').count,42);
 const p=lens.geometry.getAttribute('position');
 let highestBottom=false,outerBottom=false,minZ=Infinity,maxZ=-Infinity;
 for(let i=0;i<p.count;i++){
  const x=p.getX(i),y=p.getY(i),z=p.getZ(i);
  if(Math.abs(x)<.5&&Math.abs(y-2.93)<.001)highestBottom=true;
  if(Math.abs(x)>3.6&&Math.abs(y-2.44)<.001)outerBottom=true;
  minZ=Math.min(minZ,z);maxZ=Math.max(maxZ,z);
 }
 assert.ok(highestBottom&&outerBottom,'restored distinctive nasal notch');
 assert.ok(maxZ-minZ>.45,'pane turns backward around temples');
 assert.equal(matches(g,'m50-twin-low-cheek-filter').length,2);
});
test('R21 lower face masks: integrated guard nose and genuinely mounted filters',()=>{
 const tactical=create('half-mask');
 for(const variant of tactical.children){
  const shell=variant.getObjectByName('rigid-half-mask-face');
  assert.equal(shell?.userData.d2IntegratedNose,true);
  assert.equal(variant.getObjectByName('half-nose-rise'),undefined,
   'no disconnected triangular nose wedge');
  const p=shell.geometry.getAttribute('position');
  let peak=false;
  for(let i=0;i<p.count;i++)if(Math.abs(p.getY(i)-3.02)<.001)peak=true;
  assert.ok(peak,'nose rise integrated in the same mesh');
 }
 const resp=create('respirator-half');
 assert.deepEqual(resp.children.map(c=>c.userData.d2MaskMode),
  ['twin-filter','compact-filter']);
 assert.equal(matches(resp,'dual-filter-canister').length,2);
 assert.equal(matches(resp,'compact-front-filter').length,1);
 for(const pod of matches(resp,'dual-filter-canister'))
  assert.equal(pod.userData.d2Anchored,true);
 assert.equal(matches(resp.children[1],'respirator-valve').length,0,
  'compact mode replaces valve rather than stacking');
});
test('R21 mounted hardware uses near-shell rather than arbitrary global Z',()=>{
 const rs=[
  {y:0,halfWidth:2,frontHalf:1,cheekHalf:1.65,
   frontZ:-5.25,cheekZ:-5.0,cornerZ:-3.9,returnZ:-1.8},
  {y:4,halfWidth:3.8,frontHalf:1.7,cheekHalf:3.1,
   frontZ:-5.0,cheekZ:-4.8,cornerZ:-3.8,returnZ:-1.8}
 ];
 const at=surfaceAt(rs,2,2),front=surfaceAt(rs,0,2);
 assert.ok(at.position[2]>front.position[2],
  'cheek position naturally recedes relative to front');
 assert.ok(at.normal[0]>0,'right cheek normal angles outward');
});
test('R21 GP5 stays enclosed and M17/M40 retain protected signatures',()=>{
 const gp=create('gas-gp5');
 const h=box(gp.getObjectByName('hood-crown'));
 assert.ok(h.max.y>=7.55&&h.min.y<=-2.25);
 assert.ok(h.min.x<=-4.45&&h.max.x>=4.45);
 assert.equal(matches(gp,'gp5-round-eye-lens').length,2);
 const m17=create('gas-m17'),m40=create('gas-m40');
 assert.equal(matches(m17,'m17-integrated-cheek-filter').length,2);
 assert.equal(matches(m40,'m40-projecting-side-canister').length,1);
 assert.equal(matches(m40,'m40-angular-eyepiece-lens').length,2);
 assert.ok(box(m17.getObjectByName('m17-full-facepiece')).getSize(new THREE.Vector3()).x >
  box(m40.getObjectByName('m40-full-facepiece')).getSize(new THREE.Vector3()).x);
 for(const id of ['half-mask','respirator-half','gas-gp5','gas-m17','gas-m40','gas-m50']){
  const b=box(create(id));
  assert.ok(b.min.x>-7&&b.max.x<7,id+' x');
  assert.ok(b.min.y>-4.5&&b.max.y<8.5,id+' y');
  assert.ok(b.min.z>-10&&b.max.z<6,id+' z');
 }
});
