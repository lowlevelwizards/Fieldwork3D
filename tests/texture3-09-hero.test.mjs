import test from 'node:test';import assert from 'node:assert/strict';
import * as THREE from 'three';
import {renderCharacterFixture} from '../src/worldgen/asset-character-visuals.ts';
test('hero dumpster is built using distinct metal paint, lid, hardware and rubber',()=>{
 const materials=[];
 const ctx={
  solid:(color,rough,surface)=>{
   const m=new THREE.MeshStandardMaterial({color});
   m.userData.surface=surface;materials.push(m);return m;
  },
  box:(group,x,y,z,w,h,d,m)=>{
   const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);
   o.position.set(x,y,z);group.add(o);return o;
  }
 };
 const group=new THREE.Group();
 assert.equal(renderCharacterFixture(group,{x:0,y:0,w:80,h:45,fixture:'dumpster'},'dumpster',0,ctx,
  ctx.solid(0x987654,.9,'furniture-wood'),ctx.solid(0x444444,.9,'metal'),
  ctx.solid(0x777777,.9,'fabric'),ctx.solid(0x555555,.9,'metal')),true);
 assert.ok(group.children.length>=14);
 const used=new Set(group.children.map(o=>o.material?.userData?.surface).filter(Boolean));
 for(const type of ['painted-metal','plastic','tire-rubber'])
  assert.ok(used.has(type),'missing '+type);
});
