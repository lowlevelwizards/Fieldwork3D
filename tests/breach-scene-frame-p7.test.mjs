import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';

const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const between=(start,end)=>{
 const i=scene.indexOf(start),j=scene.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,'scene section must exist');
 return scene.slice(i,j);
};

test('tactical touch projection reuses vectors but returns independent world points',()=>{
 const projection=between('  screenToWorld(sx:number,sy:number):Pt|null{',
   '  /** Stage initial visible operator geometry');
 assert.match(projection,/this\.screenNdc\.set\(sx\/this\.width\*2-1,1-sy\/this\.height\*2\)/);
 assert.match(projection,/const point=this\.screenIntersection/);
 assert.match(projection,/return \{x:point\.x,y:point\.z\}/);
 assert.match(projection,/this\.screenProjection\.set\(p\.x,y,p\.y\)/);
 assert.doesNotMatch(projection,/new THREE\.Vector[23]/);
});

test('orthographic and replay camera projections only rebuild when frustum changes',()=>{
 const camera=between('  updateCamera(dt:number){','  screenToWorld(sx:number,sy:number):Pt|null{');
 assert.match(camera,/if\(this\.camera\.left!==left\|\|this\.camera\.right!==right\|\|/);
 assert.match(camera,/this\.directorOrthoCamera\.left!==left/);
 assert.match(camera,/this\.directorCamera\.aspect!==aspect/);
 assert.match(camera,/this\.camera\.updateMatrixWorld\(true\)/);
 assert.match(camera,/this\.directorOrthoCamera\.updateMatrixWorld\(true\)/);
 assert.match(camera,/this\.directorCamera\.updateMatrixWorld\(true\)/);
 assert.doesNotMatch(camera,/\.join\('\|'\)/);
});

test('reusing scratch vectors preserves unprojection and return-value independence',()=>{
 const camera=new THREE.OrthographicCamera(-80,80,80,-80,.1,200);
 camera.position.set(0,100,50);camera.lookAt(0,0,0);
 camera.updateProjectionMatrix();camera.updateMatrixWorld(true);
 const ndc=new THREE.Vector2(),point=new THREE.Vector3(),ray=new THREE.Raycaster();
 const plane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
 const toWorld=(x,y)=>{
   ndc.set(x/300*2-1,1-y/300*2);
   ray.setFromCamera(ndc,camera);
   if(!ray.ray.intersectPlane(plane,point))return null;
   return {x:point.x,y:point.z};
 };
 const a=toWorld(40,30),b=toWorld(210,190);
 assert.ok(a&&b);
 assert.notStrictEqual(a,b);
 const expected=new THREE.Raycaster();
 expected.setFromCamera(new THREE.Vector2(40/300*2-1,1-30/300*2),camera);
 const first=new THREE.Vector3();
 expected.ray.intersectPlane(plane,first);
 assert.ok(Math.abs(a.x-first.x)<1e-9&&Math.abs(a.y-first.z)<1e-9);
 assert.notDeepEqual(a,b);
});

test('shot animation uses reusable vectors while preserving copied mesh transforms',()=>{
 const effects=between('    // 079: One persistent, ID-keyed effect per actual simulation shot.',
   '    // Stable cap, one render call and no individual decal meshes/materials.');
 assert.match(effects,/const start=this\.shotStart\.set\(/);
 assert.match(effects,/const end=this\.shotEnd\.set\(/);
 assert.match(effects,/const flight=this\.shotFlight\.copy\(end\)\.sub\(start\)/);
 assert.match(effects,/effect\.line\.position\.copy\(start\)\.addScaledVector\(flight,\.5\)/);
 assert.match(effects,/effect\.impact\.position\.copy\(end\)/);
 assert.doesNotMatch(effects,/end\.clone\(\)\.sub\(start\)/);
 const a=new THREE.Vector3(1,5,7),b=new THREE.Vector3(9,11,19);
 const mid=new THREE.Vector3().copy(a).addScaledVector(new THREE.Vector3().copy(b).sub(a),.5);
 assert.deepEqual(mid.toArray(),[5,8,13]);
});
