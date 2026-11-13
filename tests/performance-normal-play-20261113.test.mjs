import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {consolidateStaticFixtureParts}
 from '../src/rendering/breach-fixture-draw-batching.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

function box(parent,material,x,cast=true){
 const mesh=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material);
 mesh.position.x=x;mesh.castShadow=cast;mesh.receiveShadow=true;
 parent.add(mesh);return mesh;
}
test('normal in-match PERF arms 3D breakdown for current and future scenes',()=>{
 const scene=source('src/breach-3d.ts');
 const loop=source('src/breach-runtime-loop.ts');
 assert.match(scene,/setPerformanceProfilingEnabled\(enabled:boolean\)/);
 assert.match(loop,/config\.getStage\(\)\?\.setPerformanceProfilingEnabled\?\.\(true\)/);
 assert.match(loop,/if\(stage!==profiledStage\)/);
 assert.match(loop,/stage\?\.setPerformanceProfilingEnabled\?\.\(!!perfOverlay\)/);
 assert.match(scene,/scenePhases:this\.profileSceneUpdate\?this\.scenePhases:null/);
});
test('opaque static fixture pieces merge without losing positions/shadow parity',()=>{
 const root=new THREE.Group();
 const material=new THREE.MeshStandardMaterial();
 box(root,material,-5);box(root,material,5);
 const counts=consolidateStaticFixtureParts(root);
 assert.deepEqual(counts,{original:2,batched:1,avoided:1});
 assert.equal(root.children.length,1);
 const merged=root.children[0];
 assert.equal(merged.castShadow,true);
 assert.equal(merged.receiveShadow,true);
 assert.equal(merged.geometry.getAttribute('uv').count,48);
 merged.geometry.computeBoundingBox();
 assert.equal(merged.geometry.boundingBox.min.x,-6);
 assert.equal(merged.geometry.boundingBox.max.x,6);
 merged.geometry.dispose();material.dispose();
});
test('intact/debris, transparent wear and shadow contracts stay separate',()=>{
 const root=new THREE.Group();
 const intact=new THREE.Group(),debris=new THREE.Group();
 root.add(intact,debris);debris.visible=false;
 const opaque=new THREE.MeshStandardMaterial();
 const wear=new THREE.MeshStandardMaterial({transparent:true,opacity:.5});
 box(intact,opaque,1);box(intact,opaque,3);
 box(intact,wear,1);box(intact,wear,3);
 box(intact,opaque,7,false);
 box(debris,opaque,0);box(debris,opaque,3);
 const a=consolidateStaticFixtureParts(intact);
 const b=consolidateStaticFixtureParts(debris);
 assert.equal(a.avoided,1);
 assert.equal(b.avoided,1);
 assert.equal(intact.children.length,4);
 assert.equal(debris.visible,false);
 assert.equal(debris.children.length,1);
 assert.equal(intact.children.filter(v=>v.material===wear).length,2);
 assert.equal(intact.children.filter(v=>v.castShadow===false).length,1);
 root.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 opaque.dispose();wear.dispose();
});
test('rendering presentation avoids redundant static changes without altering fog gates',()=>{
 const scene=source('src/breach-3d.ts');
 assert.match(scene,/detail\.obj\.visible=presentDecor\(s,detail,omniscient/);
 assert.match(scene,/if\(detail\.obj\.visible!==previousVisibility\)/);
 assert.match(scene,/this\.staticBatches\.setVisible\(detail\.obj,detail\.obj\.visible\)/);
 assert.match(scene,/const directlyObserved=!personal&&\(omniscient\|\|this\.presentationSight\.query/);
});
test('round-lifetime render scratch and fixed-tick door history are bounded',()=>{
 const scene=source('src/breach-3d.ts');
 const loop=source('src/breach-runtime-loop.ts');
 const builder=source('src/rendering/breach-site-scene-builder.ts');
 assert.match(scene,/private readonly bloodBlockerScratch:Pt\[\]=\[\]/);
 assert.match(scene,/visibleBloodBlockers\.length=0/);
 assert.match(loop,/if\(!previousRenderDoors\)previousRenderDoors=\{\}/);
 assert.match(loop,/previousRenderActors=null;previousRenderDoors=null/);
 assert.match(builder,/consolidateStaticFixtureParts\(intact\)/);
 assert.match(builder,/consolidateStaticFixtureParts\(debris\)/);
});

test('completed HUD polling is lower frequency without slowing planning, live or replay',()=>{
 const loop=source('src/breach-runtime-loop.ts');
 assert.match(loop,/const hudPeriod=state\.phase==='running'\?180:/);
 assert.match(loop,/\(state\.phase==='won'\|\|state\.phase==='lost'\)\&\&!replaying\?750:120/);
 assert.match(loop,/if\(now-hudAt>hudPeriod\)/);
 assert.match(loop,/config\.updateHud\(\);if\(replaying\)config\.updateReplayHud\(\)/);
});
