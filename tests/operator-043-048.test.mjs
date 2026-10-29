import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {stickAxis,screenDirection,stickZone,independentSticks}
  from '../src/operator-touch.ts';
import {ActorFigure} from '../src/operator-figure.ts';
import {spawnActor,stepActor} from '../src/regional-actors.ts';
import {FootstepAudio} from '../src/operator-audio.ts';
test('043: original two-thumb zones and pinch gestures are independently owned',()=>{
 assert.equal(stickZone(65,590,390,844),'left');
 assert.equal(stickZone(320,590,390,844),'right');
 assert.equal(stickZone(180,190,390,844),null);
 assert.equal(independentSticks({x:80,y:610},{x:310,y:610},390,844),true);
 assert.equal(independentSticks({x:180,y:380},{x:210,y:390},390,844),false);
 const rest=stickAxis(0,0),tiny=stickAxis(2,2),full=stickAxis(60,-60);
 assert.deepEqual(rest,{x:0,y:0});assert.deepEqual(tiny,{x:0,y:0});
 assert.ok(full.y>.65&&full.x>.65);
});
test('043: forward/right input follows camera direction and retains analog strength',()=>{
 for(const yaw of [0,.75,1.5,Math.PI]){
   const forward=screenDirection({x:0,y:1},yaw);
   const right=screenDirection({x:1,y:0},yaw);
   assert.ok(Math.abs(Math.hypot(forward.x,forward.z)-1)<1e-8);
   assert.ok(Math.abs(forward.x*right.x+forward.z*right.z)<1e-8);
   assert.ok(Math.abs(Math.hypot(right.x,right.z)-1)<1e-8);
 }
 const half=screenDirection({x:.5,y:0},1);
 assert.ok(Math.abs(Math.hypot(half.x,half.z)-.5)<1e-8);
});
test('045: restored figure is properly scaled, layered, rooted and independently owned',()=>{
 const scene=new THREE.Scene();
 const actor=spawnActor('rook','Rook','player',-220,170);
 const figure=new ActorFigure(scene,actor);
 assert.ok(scene.children.includes(figure.group));
 assert.equal(figure.group.position.y,actor.y);
 const meshes=[];
 figure.group.traverse(o=>{if(o instanceof THREE.Mesh)meshes.push(o);});
 assert.ok(meshes.length>=22,'layered soldier must have more than six boxes');
 assert.ok(Math.abs(figure.group.scale.y-1)<1e-9);
 assert.ok(meshes.some(m=>m.geometry.type==='CircleGeometry'));
 assert.ok(meshes.some(m=>m.material.color?.getHex()===0xa18a61),
   'equipment pack should be visually distinct');
 figure.dispose(scene);
 assert.ok(!scene.children.includes(figure.group));
});
test('046/048: gait and footfalls are driven by actual travel, not idle time',()=>{
 const scene=new THREE.Scene();
 const a=spawnActor('rook','Rook','player',-220,170);
 const figure=new ActorFigure(scene,a);let steps=0;
 figure.onFootfall=()=>{steps++;};
 figure.update(0);
 for(let i=1;i<=160;i++)figure.update(i/60);
 assert.equal(steps,0,'standing still should never play footsteps');
 for(let i=1;i<=150;i++){
   stepActor(a,1/60,{x:0,z:1});
   figure.update(3+i/60);
 }
 assert.ok(steps>=2,'actual travel creates alternating footfalls');
 const atRest=steps;
 for(let i=1;i<=160;i++)figure.update(6+i/60);
 assert.equal(steps,atRest,'time alone must not create footsteps');
 figure.dispose(scene);
});
test('034: player has usable walking speed, while NPC motor remains shared',()=>{
 const a=spawnActor('operator','Rook','player',-220,170);
 const b=spawnActor('npc','NPC','northline',-220,170);
 assert.ok(a.speed>=3&&a.speed<=3.5);
 assert.ok(b.speed<a.speed);
 const x=a.x,z=a.z;
 for(let i=0;i<180;i++)stepActor(a,1/60,{x:0,z:1});
 assert.ok(Math.hypot(a.x-x,a.z-z)>3);
});
test('047: default regional page hides combat chrome but preserves optional inspection',()=>{
 const source=readFileSync(new URL('../src/world-main.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../world.html',import.meta.url),'utf8');
 assert.ok(source.includes("const soloMode=!new URLSearchParams(location.search).has('tactical')"));
 assert.ok(source.includes('if(soloMode&&a.id!==operation.playerId)continue;'));
 assert.ok(source.includes('if(soloMode){'));
 assert.ok(source.includes('stepActor(player,1/60'));
 assert.ok(source.includes('touch=new FloatingTouchControls('));
 for(const id of ['inspectToggle','soundToggle','soloStatus','worldMode'])
   assert.ok(html.includes('id="'+id+'"'));
 assert.ok(html.includes('body.solo.exploring .world-info{display:none}'));
 assert.ok(source.includes('touch.enabled=explore'));
});
test('048: footstep audio is muted before an explicit gesture and may be disposed',()=>{
 const audio=new FootstepAudio();
 assert.equal(audio.muted,true);
 audio.step(false,false);
 audio.dispose();
});
