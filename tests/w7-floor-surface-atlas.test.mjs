import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {generateSite} from '../src/breach-site.ts';
import {conditionFloorPixels} from '../src/worldgen/condition-visual.ts';
import {mapBoxPixelUV} from '../src/rendering/pixel-materials.ts';
import {planFloorMaskPages,buildFloorMaskAtlas,writeFloorMaskSlot,floorMaskGeometry,floorMaskMaterial,resolveFloorWear} from '../src/rendering/floor-surface-atlas.ts';
import {enableWorldGraphicMaterial} from '../src/breach-graphic-world-lighting.ts';
test('W7 bounded atlas allocates exactly one 64x64 slot per room including clean sites',()=>{
 assert.deepEqual(planFloorMaskPages(69),[32,32,4,1]);
 const site=generateSite(97,'standard',undefined,{mission:'intel'},{archetype:'garage'});
 const atlas=buildFloorMaskAtlas(site,0);
 assert.equal(atlas.slots.size,site.rooms.length);
 assert.equal(atlas.pages.reduce((n,t)=>n+t.image.data.byteLength,0),site.rooms.length*64*64*4);
 for(const t of atlas.pages){assert.ok(t.image.height<=2048);assert.equal(t.generateMipmaps,false);assert.ok(t.image.data.every((v,i)=>i%4!==3||v===0));}
 const slot=atlas.slots.values().next().value,bytes=slot.texture.image.data,offset=slot.row*64*4,saved=bytes.slice();
 writeFloorMaskSlot(site,slot,100);
 assert.deepEqual(bytes.slice(offset,offset+64*64*4),conditionFloorPixels(site,slot.room,100));
 assert.deepEqual(bytes.slice(0,offset),saved.slice(0,offset));
 assert.deepEqual(bytes.slice(offset+64*64*4),saved.slice(offset+64*64*4));
 writeFloorMaskSlot(site,slot,0);assert.deepEqual(bytes,saved);
 atlas.pages.forEach(t=>t.dispose());
 assert.equal(resolveFloorWear(null),true);assert.equal(resolveFloorWear('compiled'),true);
 assert.equal(resolveFloorWear('legacy'),false);assert.equal(resolveFloorWear('unknown'),true);
});
test('W7 top-only mask UV preserves physical slab and repeating material UV exactly',()=>{
 const texture=new THREE.DataTexture(new Uint8Array(64*128*4),64,128);
 const w=90,d=73,h=1.6,g=floorMaskGeometry(w,h,d,{texture,row:64});
 const old=mapBoxPixelUV(new THREE.BoxGeometry(w,h,d),w,h,d);
 for(const key of ['position','normal','uv'])assert.deepEqual(g.getAttribute(key).array,old.getAttribute(key).array);
 assert.deepEqual(g.index.array,old.index.array);
 const uv=g.getAttribute('fwFloorMaskUV'),pos=g.getAttribute('position'),normal=g.getAttribute('normal');
 for(let i=0;i<uv.count;i++){
  assert.ok(uv.getX(i)>0&&uv.getX(i)<1);
  assert.ok(uv.getY(i)>.5&&uv.getY(i)<1);
  assert.equal(uv.getZ(i),normal.getY(i)>.5?1:0);
  assert.ok(Math.abs(uv.getX(i)-(.5+(pos.getX(i)/w+.5)*63)/64)<1e-6);
 }
 g.dispose();old.dispose();texture.dispose();
});
test('W7 shared shader hook composes with F1 lighting without mutating palette',()=>{
 const base=new THREE.MeshStandardMaterial({color:0x998877,roughness:.92,map:new THREE.Texture()});
 enableWorldGraphicMaterial(base);
 const texture=new THREE.DataTexture(new Uint8Array(64*64*4),64,64);
 const m=floorMaskMaterial(base,texture);
 assert.equal(m.map,base.map);assert.equal(m.color.getHex(),base.color.getHex());
 assert.equal(m.transparent,false);assert.equal(m.depthWrite,true);
 assert.ok(enableWorldGraphicMaterial(m));
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>\n#include <lights_fragment_end>'};
 m.onBeforeCompile(shader,null);
 assert.equal(shader.uniforms.fwFloorMask.value,texture);
 assert.match(shader.fragmentShader,/diffuseColor.rgb=mix/);
 assert.match(shader.fragmentShader,/fwWorldBand/);
 assert.match(m.customProgramCacheKey(),/w7-floor-mask-v1/);
 assert.equal(base.userData.fieldworkR718WorldGraphic,true);
 m.dispose();base.map.dispose();base.dispose();texture.dispose();
});

import {planCompiledFloorWear,indexFloorWear} from '../src/worldgen/floor-wear-plan.ts';
import {rasterFloorWear} from '../src/rendering/floor-wear-raster.ts';
test('W7 compiled floor story is deterministic, source-local, clean-isolated and clipped',()=>{
 const room={id:'r',x:0,y:0,w:100,h:80,kind:'room',purpose:'kitchen'};
 const site={seed:23,archetype:'restaurant',condition:'occupied',conditionLevel:100,rooms:[room],doors:[],cover:[{fixture:'commercial-range',x:40,y:15,w:24,h:20,orientation:0}]};
 const marks=planCompiledFloorWear(site);
 assert.deepEqual(marks,planCompiledFloorWear(site));assert.deepEqual(planCompiledFloorWear(site,0),[]);
 const grease=marks.find(m=>m.kind==='grease');assert.ok(grease);assert.ok(grease.y>25);
 assert.ok(!planCompiledFloorWear({...site,cover:[]}).some(m=>m.kind==='grease'||m.kind==='oil'));
 const empty=new Uint8Array(64*64*4),single={id:'m',roomId:'r',kind:'oil',x:10,y:10,width:18,depth:14,rotation:0,opacity:.4};
 const out=rasterFloorWear(empty.slice(),room,0,[single],64);
 assert.ok(out.some((v,i)=>i%4===3&&v>0));
 assert.equal(out[(63*64+63)*4+3],0);
 assert.deepEqual(rasterFloorWear(empty.slice(),room,0,[{...single,roomId:'elsewhere'}],64),empty);
 const atlas=buildFloorMaskAtlas(site,100,marks),slot=atlas.slots.get('r'),original=slot.texture.image.data.slice();
 writeFloorMaskSlot(site,slot,0,[]);assert.ok(slot.texture.image.data.every((v,i)=>i%4!==3||v===0));
 writeFloorMaskSlot(site,slot,100,indexFloorWear(marks).get('r'));assert.deepEqual(slot.texture.image.data,original);
 atlas.pages.forEach(t=>t.dispose());
});

import {projectFixtureWear} from '../src/rendering/fixture-wear-projection.ts';
test('W7 fixture wear modifies a real opaque face without extra meshes or shared geometry mutation',()=>{
 const root=new THREE.Group(),geo=new THREE.BoxGeometry(20,24,12);
 const material=new THREE.MeshStandardMaterial({color:0x888888,map:new THREE.Texture()});
 material.map.name='Fieldwork pixel 5:painted-metal:0';
 const mesh=new THREE.Mesh(geo,material);mesh.position.y=12;root.add(mesh);
 const mark={id:'fixture:0',owner:'fixture',index:0,kind:'rust',u:.5,v:.5,size:10,opacity:.4};
 const textures=new Map(),cache=new Map(),owned=[],boost={value:1};
 assert.ok(projectFixtureWear(root,mark,0,12,6.8,'painted-metal',{textures,cache,boost,track:m=>owned.push(m),shared:new Set([geo]),template:false}));
 assert.equal(root.children.length,1);assert.notEqual(mesh.geometry,geo);assert.equal(geo.getAttribute('fwFixtureWearUV'),undefined);
 assert.deepEqual(mesh.geometry.getAttribute('position').array,geo.getAttribute('position').array);
 const uv=mesh.geometry.getAttribute('fwFixtureWearUV'),normal=mesh.geometry.getAttribute('normal');
 for(let i=0;i<uv.count;i++)assert.equal(uv.getZ(i),normal.getZ(i)>.9?1:0);
 assert.equal(mesh.material.transparent,false);assert.equal(mesh.material.map,material.map);assert.equal(owned.length,1);
 const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};
 mesh.material.onBeforeCompile(shader,null);assert.equal(shader.uniforms.fwFixtureBoost,boost);
 assert.match(shader.fragmentShader,/fwWearA/);
 mesh.geometry.dispose();geo.dispose();material.map.dispose();material.dispose();owned.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
});

import {readFileSync} from 'node:fs';
test('W7 projection occurs only after existing repeated-fixture membership is finalized',()=>{
 const source=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
 assert.ok(source.indexOf('host.repeatedFixtures?.flush(')<source.indexOf('for(const apply of host.pendingFixtureWear'));
 assert.match(source,/originalChildren.some\(child=>child.parent!==intact\)/);
 assert.match(source,/host.root.traverse\(node=>\{if\(node instanceof THREE.Mesh\)host.retiredFixtureWearGeometry!.delete\(node.geometry\)/);
});
