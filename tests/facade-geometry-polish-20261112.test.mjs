import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {planWallCapJoins} from '../src/rendering/wall-cap-joins.ts';
import {conditionWallPixels,wallPatinaDimensions}
 from '../src/worldgen/condition-wall.ts';
import {buildSiteExterior} from '../src/rendering/breach-site-exterior-builder.ts';
import {buildSiteWindows} from '../src/rendering/breach-site-openings-builder.ts';

const wall=(x,y,u,v)=>({a:{x,y},b:{x:u,y:v}});
test('joined wall caps trim ends and have only one named connector per corner',()=>{
 const walls=[wall(0,0,80,0),wall(80,0,80,60),wall(80,60,130,60)];
 const {trims,junctions}=planWallCapJoins(walls);
 assert.deepEqual(trims,[[0,5.5],[5.5,5.5],[5.5,0]]);
 assert.equal(junctions.length,2);
 assert.deepEqual(junctions[0].p,{x:80,y:0});
 assert.deepEqual(junctions[1].p,{x:80,y:60});
});
test('long wall weather maps keep physical horizontal pixel density',()=>{
 const fake={seed:126,archetype:'office',condition:'neglected',
   walls:[wall(0,0,210,0)],rooms:[],windows:[],cover:[]};
 const short=wallPatinaDimensions(38),long=wallPatinaDimensions(210);
 assert.deepEqual(short,{width:64,height:64});
 assert.deepEqual(long,{width:256,height:64});
 const pixels=conditionWallPixels(fake,0,90,long.width,long.height);
 assert.equal(pixels.length,256*64*4);
 assert.deepEqual(pixels,conditionWallPixels(fake,0,90,256,64));
 assert.equal(conditionWallPixels(fake,0,90).length,64*64*4);
});
function fakeHost(){
 const root=new THREE.Group(),materials=[];
 const solid=hex=>new THREE.MeshStandardMaterial({color:hex});
 const box=(parent,x,y,z,w,h,d,material)=>{
   const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
   mesh.position.set(x,y,z);parent.add(mesh);return mesh;
 };
 return {root,box,materials,host:{
   root,box,solid,age:n=>n,track:m=>{materials.push(m);return m;},
   plane:()=>new THREE.Mesh(),overlay:()=>new THREE.MeshBasicMaterial()
 }};
}
test('both orientations of storefront awning have complete edges, ledgers and bracing',()=>{
 const site={seed:4,archetype:'retail',
   rooms:[{id:'r0',kind:'room',x:90,y:90,w:180,h:130}],
   windows:[
    {id:'H',x:166,y:220,width:72,vertical:false,style:'storefront'},
    {id:'V',x:270,y:170,width:60,vertical:true,style:'storefront'}
   ],bounds:{minX:0,minY:0,maxX:420,maxY:420},
   doors:[],cover:[],exteriorZones:[],structures:[]};
 const {root,host}=fakeHost();
 buildSiteExterior(site,host);
 const beams=root.children.filter(m=>m instanceof THREE.Mesh &&
   (Math.abs(m.rotation.z)>.001||Math.abs(m.rotation.x)>.001));
 assert.ok(beams.length>=2,'cantilever brackets must physically slope');
});
test('window header carries matching cap rather than leaving white lintel bridge',()=>{
 const site={windows:[{id:'W',x:90,y:180,width:72,vertical:false,
   style:'storefront',sillHeight:0,headHeight:50}]};
 const {root,box}=fakeHost(),cap=new THREE.MeshStandardMaterial({color:0x222222});
 const trim=new THREE.MeshStandardMaterial({color:0x777777});
 const host={root,box,solid:()=>trim,age:n=>n,track:m=>m,
   registerGlass:()=>{},promoteFacadeDetails:()=>{},
   registerWallSurface:()=>{},marksOn:()=>[],addSurfaceWear:()=>{}};
 // Minimal accessible exterior wall lookup only requires non-interior site.
 buildSiteWindows(site,host,{paneMat:trim,wallMat:trim,capMat:cap,
   doorTrim:trim,metal:trim});
 const crowns=[];
 root.traverse(child=>{
   if(child instanceof THREE.Mesh&&child.material===cap)crowns.push(child);
 });
 assert.equal(crowns.length,1);
 assert.equal(crowns[0].geometry.parameters.width,71.6);
 assert.equal(crowns[0].position.y,56.3);
});
