import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x5c5c4b});
const cuboids=group=>group.children[0].geometry.userData.cuboids;
const bounds=part=>({
 x:[part.x-part.width/2,part.x+part.width/2],
 y:[part.y-part.height/2,part.y+part.height/2],
 z:[part.z-part.depth/2,part.z+part.depth/2]
});
const overlaps=(a,b)=>['x','y','z'].every(axis=>
 Math.min(bounds(a)[axis][1],bounds(b)[axis][1])-
 Math.max(bounds(a)[axis][0],bounds(b)[axis][0])>.009);
function connected(parts){
 const seen=new Set([0]),work=[0];
 while(work.length){
  const i=work.pop();
  for(let j=0;j<parts.length;j++)
   if(!seen.has(j)&&overlaps(parts[i],parts[j])){
    seen.add(j);work.push(j);
   }
 }
 return seen.size===parts.length;
}
test('R5 bandana wraps the full head and drops into a free-hanging triangle beneath the chin',()=>{
 const wrap=createD2FabricWrap('bandana',cloth);
 assert.deepEqual(wrap.children.map(x=>x.userData.d2WrapMode),['raised','lowered']);
 for(const mode of wrap.children){
  const bits=cuboids(mode),names=bits.map(x=>x.name);
  const band=bits.find(x=>x.name==='wrap-band-front');
  const tip=bits.find(x=>x.name==='triangle-tip');
  const front=bits.filter(x=>x.name.startsWith('triangle-'));
  assert.equal(front.length,6,'a few bold steps rather than many tiny slices');
  assert.ok(band&&tip&&tip.width>=band.width*.29&&tip.width<band.width*.40,
   'tip is pointed but not a tiny dangling goatee');
  assert.ok(front.every(x=>x.depth>=.88),'thick hanging cloth, not planar decals');
  assert.ok(names.includes('left-wrap-band')&&names.includes('right-wrap-band'));
  assert.ok(names.includes('left-cheek-transition')&&names.includes('right-cheek-transition'));
  assert.ok(names.includes('left-diagonal-kerchief-fold')&&names.includes('right-diagonal-kerchief-fold'));
  assert.ok(names.includes('left-lower-fan-fold')&&names.includes('right-lower-fan-fold'));
  assert.ok(front[3].width>tip.width*1.8,'broad triangle must span the lower jaw');
  assert.ok(names.includes('closed-rear-landing')&&names.includes('rear-knot'));
  assert.ok(names.includes('knot-left-wing')&&names.includes('knot-right-wing'));
  assert.equal(bits.filter(x=>x.name.endsWith('-knot-tail')).length,2);
  assert.ok(connected(bits),'no disconnected knots or hanging panels');
  assert.equal(mode.children.length,1,'premerged exterior geometry, never per-frame rebuilt');
  assert.equal(mode.children[0].geometry.userData.greedyCuboidUnion,true);
  assert.ok(tip.z<band.z-.60,'free tip projects forward instead of hugging head');
 }
 const [raised,lowered]=wrap.children.map(x=>new THREE.Box3().setFromObject(x));
 assert.ok(raised.min.y< -3.9,'raised triangle must hang well below canonical chin -.65');
 assert.ok(raised.max.y>3,'raised upper band still covers lower face');
 assert.ok(lowered.max.y<0,'lowered mode does not mask the face');
 assert.ok(lowered.min.y< -5,'lowered triangle still reads as a kerchief');
 assert.ok(lowered.min.y> -7,'lowered bandana remains shorter than bulky shemagh');
});
