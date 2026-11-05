import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createD2FabricWrap} from '../src/operator-d2-fabric-wraps.ts';
const cloth=new THREE.MeshStandardMaterial({color:0x5c5c4b});
const cuboids=group=>group.children[0].geometry.userData.cuboids;
test('V3 bandana keeps a sharp taper, visible rear knot and uneven tails',()=>{
 const bandana=createD2FabricWrap('bandana',cloth);
 assert.deepEqual(bandana.children.map(g=>g.userData.d2WrapMode),['raised','lowered']);
 for(const mode of bandana.children){
  const b=cuboids(mode),names=b.map(x=>x.name);
  const triangle=b.filter(x=>x.name.startsWith('tapered-triangle-'));
  assert.equal(triangle.length,5);
  const widths=triangle.map(x=>x.width);
  for(let i=1;i<widths.length;i++)
   assert.ok(widths[i]<widths[i-1],'triangle narrows at each lower row');
  assert.ok(widths[4]<widths[0]/3,'large deliberate front taper');
  assert.ok(names.includes('rear-knot'));
  assert.ok(names.includes('knot-left-wing')&&names.includes('knot-right-wing'));
  const tails=b.filter(x=>x.name.endsWith('-knot-tail'));
  assert.equal(tails.length,2);
  assert.notEqual(tails[0].height,tails[1].height);
  assert.ok(b.every(x=>!x.name.includes('tube')&&!x.name.includes('scarf-collar')));
  assert.equal(mode.children.length,1,'each mode consolidated into one mesh');
 }
 const [raised,lowered]=bandana.children.map(m=>new THREE.Box3().setFromObject(m));
 assert.ok(raised.max.y>3&&raised.min.y<.5);
 assert.ok(lowered.max.y<0,'lowered knot/band remains beneath face');
});
