import test from 'node:test';
import assert from 'node:assert/strict';
import {planExteriorFinishDetails,EXTERIOR_FINISH_LIMIT} from '../src/worldgen/exterior-finish-details.ts';
import {planPropertySurfaces} from '../src/worldgen/property-surfaces.ts';
import {propertySurfaceCenterHeight,PROPERTY_SURFACE_THICKNESS} from '../src/rendering/property-surface-elevation.ts';
import {assertPropertySurfaceSubstrate} from './property-surface-substrate.mjs';
const garden={id:'rear-property',kind:'garden',x:200,y:200,w:180,h:100};
const site={seed:7,conditionLevel:80,rooms:[],doors:[],cover:[{x:190,y:200,w:53,h:37,fixture:'picnic-table'}],exteriorZones:[garden]};
test('V18 occupied outdoor amenity aprons follow real accepted furniture',()=>{
 const before=structuredClone(site);
 const marks=planPropertySurfaces(site);
 const apron=marks.find(m=>m.kind==='amenity-apron');
 assert.ok(apron);assert.equal(apron.x,190);assert.equal(apron.width,65);
 assert.deepEqual(site,before);
 assert.deepEqual(marks,planPropertySurfaces(site));
 assert.ok(!planPropertySurfaces({...site,cover:[]}).some(m=>m.kind==='amenity-apron'));
 for(const m of marks)assertPropertySurfaceSubstrate(site,m);
});
test('V18 ground finish avoids conflicting substrates and other marks',()=>{
 assert.equal(planExteriorFinishDetails({...site,rooms:[{x:150,y:160,w:80,h:80}]},[]).length,0);
 assert.equal(planExteriorFinishDetails(site,[{kind:'path',zoneId:garden.id,x:190,y:200,width:65,depth:49}]).length,0);
 const zones=Array.from({length:20},(_,i)=>({id:'service-'+i,kind:'service',x:i*300,y:200,w:220,h:100}));
 const details=planExteriorFinishDetails({...site,exteriorZones:zones,cover:[]},[]);
 assert.ok(details.length>0&&details.length<=EXTERIOR_FINISH_LIMIT);
 for(const m of details)assertPropertySurfaceSubstrate({...site,exteriorZones:zones},m);
});
test('V18 work wear is condition-dependent and kept below existing clearance paint',()=>{
 const s={...site,exteriorZones:[{...garden,kind:'service'}],cover:[{x:145,y:180,w:24,h:24,fixture:'tire-stack'}]};
 assert.ok(planExteriorFinishDetails(s,[]).some(m=>m.kind==='work-wear'));
 assert.ok(!planExteriorFinishDetails({...s,conditionLevel:0},[]).some(m=>m.kind==='work-wear'));
 const top=k=>propertySurfaceCenterHeight(k)+PROPERTY_SURFACE_THICKNESS/2;
 assert.ok(top('work-wear')>top('service-pad'));
 assert.ok(top('work-wear')<top('clear-route'));
});

import * as THREE from 'three';
import {ExteriorFinishPackets,isFlatExteriorFinish} from '../src/rendering/exterior-finish-packets.ts';
test('V18 accepts legacy partial site inspector inputs',()=>{
 assert.doesNotThrow(()=>planPropertySurfaces({seed:3,doors:[],exteriorZones:[garden]}));
});
test('V18 compiles flat paint without extra thickness, shadows or material ownership',()=>{
 const compiler=new ExteriorFinishPackets(),root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
 const mark={id:'a',zoneId:'rear-property',kind:'pavement-joint',x:20,y:30,width:2,depth:12};
 compiler.add(mark,material);compiler.add({...mark,x:40},material);compiler.add({...mark,x:300},material);
 assert.deepEqual(compiler.flush(root),{marks:3,packets:2});
 assert.equal(root.children.reduce((n,m)=>n+m.geometry.index.count/3,0),6);
 for(const mesh of root.children){
  assert.equal(mesh.material,material);assert.equal(mesh.castShadow,false);assert.equal(mesh.receiveShadow,true);
  mesh.geometry.computeBoundingBox();
  assert.ok(Math.abs(mesh.geometry.boundingBox.max.y-mesh.geometry.boundingBox.min.y)<1e-5);
 }
 assert.equal(isFlatExteriorFinish('sidewalk'),false);assert.equal(isFlatExteriorFinish('curb-ramp'),false);
 assert.deepEqual(compiler.flush(root),{marks:0,packets:0});
});
