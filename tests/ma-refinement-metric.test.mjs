import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {buildWallAtlas,updateWallAtlas} from '../src/rendering/wall-surface-atlas.ts';
import {mapAtlasWallUV,boxFaceVertexRanges} from '../src/rendering/pixel-materials.ts';
import {resolveWallSurfaceMode} from '../src/worldgen/wall-surface-recipe.ts';
import {projectFixtureWear} from '../src/rendering/fixture-wear-projection.ts';
import {wearVariant,wearPixels} from '../src/rendering/pixel-decals.ts';
const site={seed:23,archetype:'house',condition:'renovation',conditionLevel:100,
 walls:Array.from({length:35},(_,i)=>({a:{x:0,y:i*200},b:{x:96,y:i*200}})),
 doors:[],windows:[],rooms:[],cover:[]};
test('metric candidate uses active physical width and guarded faces, legacy remains default',()=>{
 assert.equal(resolveWallSurfaceMode(null).metric,undefined);
 assert.equal(resolveWallSurfaceMode('metric').metric,true);
 const normal=buildWallAtlas(site,56,100,'all',true),metric=buildWallAtlas(site,56,100,'all',true,undefined,false,true);
 assert.equal(metric.slots.size,normal.slots.size);
 assert.equal(metric.pages.reduce((n,t)=>n+t.image.data.byteLength,0),2*normal.pages.reduce((n,t)=>n+t.image.data.byteLength,0));
 for(const p of metric.pages)assert.ok(p.image.height<=2048);
 const slot=metric.slots.get(0),{width,height,data}=slot.texture.image,stride=width*4;
 assert.equal(slot.metricWidth,96);
 for(const start of [4,68]){
  assert.deepEqual(data.slice((start-1)*stride,start*stride),data.slice(start*stride,(start+1)*stride));
  assert.deepEqual(data.slice((start+56)*stride,(start+57)*stride),data.slice((start+55)*stride,(start+56)*stride));
  assert.deepEqual(data.slice(start*stride+95*4,start*stride+96*4),data.slice(start*stride+127*4,start*stride+128*4));
 }
 const geo=new THREE.BoxGeometry(96,56,9),pos=geo.getAttribute('position').array.slice();
 mapAtlasWallUV(geo,slot.row,height,slot.metricWidth,width);
 assert.deepEqual(geo.getAttribute('position').array,pos);
 const uv=geo.getAttribute('uv');for(const [face,{start,count}] of boxFaceVertexRanges(geo).entries())if(face>=4)for(let i=start;i<start+count;i++){
  assert.ok(uv.getX(i)>=.5/width&&uv.getX(i)<=95.5/width);
 }
 const original=metric.pages.map(p=>p.image.data.slice());
 updateWallAtlas(metric.slots.values(),0,'all');updateWallAtlas(metric.slots.values(),100,'all');
 metric.pages.forEach((p,i)=>assert.deepEqual(p.image.data,original[i]));
 geo.dispose();[...normal.pages,...metric.pages].forEach(t=>t.dispose());
});
test('fixture variants share one site-owned atlas and actual worktop projection',()=>{
 const textures=new Map(),cache=new Map(),owned=[],tracked=[];
 const material=new THREE.MeshStandardMaterial({color:0x998866,map:new THREE.Texture()});
 material.map.name='Fieldwork pixel 7:furniture-wood:0';
 for(const id of ['fixture:1','fixture:2']){
  const root=new THREE.Group(),geo=new THREE.BoxGeometry(24,4,20),mesh=new THREE.Mesh(geo,material);
  mesh.position.y=20;root.add(mesh);
  const mark={id,owner:'fixture',index:0,kind:'scratch',u:.5,v:.5,size:10,opacity:.4};
  assert.ok(projectFixtureWear(root,mark,0,12,10,'furniture-wood',{textures,cache,boost:{value:1},track:m=>owned.push(m),shared:new Set([geo]),template:false,fixture:'desk',variantAtlas:true,trackTexture:t=>tracked.push(t)}));
  const uv=mesh.geometry.getAttribute('fwFixtureWearUV'),variant=mesh.geometry.getAttribute('fwFixtureWearVariant'),normal=mesh.geometry.getAttribute('normal');
  for(let i=0;i<uv.count;i++){assert.equal(uv.getZ(i),normal.getY(i)>.9?1:0);assert.equal(variant.getX(i),wearVariant(id));}
  assert.equal(root.children.length,1);mesh.geometry.dispose();geo.dispose();
 }
 assert.equal(textures.size,1);assert.equal(tracked.length,1);assert.equal(tracked[0].image.width,64);
 for(let v=0;v<4;v++){const mask=wearPixels('scratch',v),row=10,start=((Math.floor(v/2)*32+row)*64+(v%2)*32)*4;
  assert.deepEqual(tracked[0].image.data.slice(start,start+128),mask.slice(row*128,(row+1)*128));}
 material.map.dispose();material.dispose();owned.forEach(m=>m.dispose());tracked.forEach(t=>t.dispose());
});

import {buildFloorMaskAtlas,writeFloorMaskSlot,floorMaskGeometry} from '../src/rendering/floor-surface-atlas.ts';
test('metric floors use square world texels and bounded rectangular atlas pages',()=>{
 const room={id:'r',kind:'room',purpose:'living',x:0,y:0,w:96,h:72,tone:0};
 const s={...site,rooms:[room],programLocked:true};
 const normal=buildFloorMaskAtlas(s,100),metric=buildFloorMaskAtlas(s,100,[],1,true),slot=metric.slots.get('r');
 assert.equal(normal.pages[0].image.width,64);
 assert.equal(slot.metricWidth,96);assert.equal(slot.metricHeight,72);
 assert.equal(slot.texture.image.width,128);assert.equal(slot.texture.image.height,128);
 const data=slot.texture.image.data.slice(),g=floorMaskGeometry(96,1.6,72,slot),uv=g.getAttribute('fwFloorMaskUV');
 for(let i=0;i<uv.count;i++){assert.ok(uv.getX(i)>=.5/128&&uv.getX(i)<=95.5/128);assert.ok(uv.getY(i)>=.5/128&&uv.getY(i)<=71.5/128);}
 writeFloorMaskSlot(s,slot,0);assert.ok(slot.texture.image.data.every((v,i)=>i%4!==3||v===0));
 writeFloorMaskSlot(s,slot,100);assert.deepEqual(slot.texture.image.data,data);
 g.dispose();[...normal.pages,...metric.pages].forEach(t=>t.dispose());
});
