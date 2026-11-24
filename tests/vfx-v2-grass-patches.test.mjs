import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildGrassPatchMeshes} from '../src/rendering/perplung-grass-patches.ts';
import {planGrassPatches,regroupGrassPatches,GRASS_MAX_PATCHES,GRASS_MAX_TUFTS} from '../src/rendering/perplung-grass-placement.ts';
import {generateSite} from '../src/breach-site.ts';
test('V2 grass placement deterministic and bounded across generated sites',()=>{
 for(const seed of [3,17,61,31149]){
  const site=generateSite(seed,'standard');
  const before=JSON.stringify(site),a=planGrassPatches(site),b=planGrassPatches(site);
  assert.deepEqual(a,b);assert.equal(JSON.stringify(site),before);
  assert.ok(a.length<=GRASS_MAX_PATCHES);
  const tufts=a.flatMap(p=>p.tufts);
  assert.ok(tufts.length<=GRASS_MAX_TUFTS);
  for(const t of tufts){
   assert.ok((site.exteriorZones??[]).some(z=>['yard','garden'].includes(z.kind)&&Math.abs(t.x-z.x)<z.w/2&&Math.abs(t.z-z.y)<z.h/2));
   assert.ok(!site.cover.some(c=>Math.abs(t.x-c.x)<=c.w/2&&Math.abs(t.z-c.y)<=c.h/2));
   assert.ok(t.variant>=0&&t.variant<4);
  }
 }
});
test('V2 static instance patch uses one draw and conservative culling bounds, releases resources once',()=>{
 const texture=new THREE.Texture();
 const t={x:40,z:80,y:-1.4,width:7,height:8,yaw:.4,phase:1,variant:0,tint:1};
 const p=buildGrassPatchMeshes([{key:'0:0',tufts:[t,{...t,x:60,variant:3}]}],texture);
 assert.equal(p.meshes.length,1);const m=p.meshes[0];
 assert.equal(m.count,2);assert.equal(m.geometry.index.count,12);
 assert.equal(m.geometry.attributes.grassStyle.getX(1),3);
 assert.equal(m.material,p.material);assert.equal(m.castShadow,false);
 assert.ok(m.boundingSphere.radius>10);
 let disposed=0;texture.addEventListener('dispose',()=>disposed++);
 p.dispose();p.dispose();assert.equal(disposed,1);assert.equal(p.group.children.length,0);
});

test('V2 creates actual grass on a synthetic yard and rejects a paved overlap',()=>{
 const site={seed:7,layout:'courtyard',rooms:[],walls:[],doors:[],cover:[],spawn:[],
  exteriorZones:[{id:'yard-test',kind:'yard',x:100,y:100,w:150,h:150},
   {id:'parking-test',kind:'parking',x:135,y:100,w:40,h:80}],
  bounds:{minX:0,minY:0,maxX:200,maxY:200}};
 const tufts=planGrassPatches(site).flatMap(p=>p.tufts);
 assert.ok(tufts.length>0);
 for(const t of tufts)assert.ok(Math.abs(t.x-135)>20||Math.abs(t.z-100)>40);
});

test('V2 coarse batching preserves every tuft reference and reduces occupied cells',()=>{
 const t={x:40,z:80,y:-1.4,width:7,height:8,yaw:.4,phase:1,variant:0,tint:1};
 const a=[{key:'0:0',tufts:[t]},{key:'1:0',tufts:[{...t,x:120}]}];
 const b=regroupGrassPatches(a);
 assert.equal(b.length,1);assert.deepEqual(b[0].tufts,a.flatMap(p=>p.tufts));
 assert.equal(b[0].tufts[0],t);assert.throws(()=>regroupGrassPatches(a,0));
});
