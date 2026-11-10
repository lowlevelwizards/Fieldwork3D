/** Stage 3 closeout: same-session view parity, historic disclosure and
 * bounded Three.js resources. Real collision/LOS and replay evidence stay
 * outside the render-only policies being tested.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';
import {paintFogVisibility} from '../src/breach-fog-mask.ts';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
import {spatialSurfaceKnown} from '../src/breach-presentation.ts';
import {personalCoverVisible} from '../src/breach-replay-personal-visibility.ts';
import {presentArchitecturalOpening,presentTransientEvidence,
 presentUnrecordedRescueMarker,presentDecor}
 from '../src/rendering/breach-3d-disclosure-presenter.ts';
import {BreachCombatEffectsPresenter,MAX_DROPPED_MAGAZINE_VISUALS}
 from '../src/rendering/breach-combat-effects-presenter.ts';
import {StaticSceneBatches} from '../src/rendering/breach-static-batcher.ts';
import {reconcileSceneActorLifetimes}
 from '../src/rendering/breach-actor-frame-presenter.ts';

function recordingContext(){
 const points=[];
 const ctx={
  canvas:{width:320,height:370},globalCompositeOperation:'source-over',
  filter:'none',fillStyle:'#fff',
  save(){},restore(){},setTransform(){},beginPath(){},
  moveTo(x,y){points.push([x,y]);},
  lineTo(x,y){points.push([x,y]);},
  closePath(){},fill(){}
 };
 return {ctx,points};
}
const siteSession=seed=>newSession(0,seed,'true-blind','small');
test('Stage 3: 2D fog polygons use this session, even when another map is active',()=>{
 try{
  const a=siteSession(7),b=siteSession(19);
  const first=recordingContext();
  activateSite(a.site);paintFogVisibility(first.ctx,a);
  const original=first.points.map(p=>[...p]);
  const world=sessionWorldGeometry(a),actor=team(a)[0];
  const expected=visionPolygon(actor.p,actor.heading,240,
    world.walls,a.doors,actor.posture==='crouch',world.cover);
  assert.deepEqual(original.slice(0,expected.length),expected.map(p=>[p.x,p.y]));
  const other=recordingContext();
  activateSite(b.site);paintFogVisibility(other.ctx,a);
  assert.deepEqual(other.points,original,
    'global geometry swap must not alter another session fog');
  const alternate=recordingContext();
  paintFogVisibility(alternate.ctx,b);
  assert.notDeepEqual(alternate.points,original,
    'distinct seeded maps must not collapse into the same fog');
 }finally{activateSite(null);}
});
test('Stage 3: same-seed sessions retain identical disclosure and fog under interleaving',()=>{
 try{
  const a=siteSession(31),b=siteSession(31),other=siteSession(19);
  const signature=s=>{
   const out=recordingContext();paintFogVisibility(out.ctx,s);
   return {
    fog:out.points,
    rooms:(s.site?.rooms??[]).map(room=>
      spatialSurfaceKnown(s,'room',room.id)),
    doors:s.doors.map(door=>spatialSurfaceKnown(s,'door',door.id)),
    cover:s.coverState.map((_,i)=>spatialSurfaceKnown(s,'cover',i))
   };
  };
  activateSite(other.site);
  assert.deepEqual(signature(a),signature(b));
  activateSite(a.site);
  assert.deepEqual(signature(a),signature(b));
 }finally{activateSite(null);}
});
test('Stage 3: personal replay never inherits current squad LOS for an unseen opening',()=>{
 try{
  const s=siteSession(7),opening={
   id:'inside',kind:'arch',a:{x:180,y:160},b:{x:180,y:200}
  },policy={mode:'operator',observerId:'rook'};
  s.intel.mode='true-blind';
  assert.equal(presentArchitecturalOpening(s,opening,false,policy,null),false);
  const known=new Set(['micro:18,18']);
  assert.equal(presentArchitecturalOpening(s,opening,false,policy,known),true);
  assert.equal(presentArchitecturalOpening(s,opening,false,policy,
    new Set(['9,9'])),false,'coarse team knowledge is not personal evidence');
  s.intel.mode='floor-plan';
  assert.equal(presentArchitecturalOpening(s,opening,false,policy,null),true,
    'explicitly briefed plan structure remains legitimate');
 }finally{activateSite(null);}
});
test('Stage 3: personal replay gates cover and decor independent of Bodycam mode',()=>{
 const p={x:185,y:185};
 const known=new Set(['fine:9,9']);
 assert.equal(personalCoverVisible(true,true,null,p),false);
 assert.equal(personalCoverVisible(true,true,known,p),true);
 assert.equal(personalCoverVisible(true,false,null,p),true);
 const detail={position:p,microKey:'micro:18,18',fineKey:'fine:9,9'};
 const s={seenGround:new Set(['fine:9,9']),operators:[],intel:{mode:'floor-plan'}};
 assert.equal(presentDecor(s,detail,false,true,null),false);
 assert.equal(presentDecor(s,detail,false,true,known),true);
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(scene,/personalCoverVisible\(squadKnown,personalDisclosure/);
 assert.match(scene,/personalDisclosure,personalGroundEvidence\)/);
 assert.match(scene,/presentArchitecturalOpening\(s,opening\.opening/);
 assert.match(scene,/const personalDisclosure=replayDisclosurePolicy\?\.mode==='operator'/);
});
test('Stage 3: absent recorded rescue marker fails closed in non-full replay',()=>{
 const s={rescue:{p:{x:180,y:180}}};
 assert.equal(presentUnrecordedRescueMarker(s,false,{mode:'squad'}),false);
 assert.equal(presentUnrecordedRescueMarker(s,false,
   {mode:'operator',observerId:'rook'}),false);
 assert.equal(presentUnrecordedRescueMarker(s,false,{mode:'full'}),true);
});
test('Stage 3: transient evidence never leaks in restricted personal playback',()=>{
 const p={x:100,y:100};
 assert.equal(presentTransientEvidence(p,false,true,()=>true),false);
 assert.equal(presentTransientEvidence(p,true,true,()=>true),false);
 assert.equal(presentTransientEvidence(p,false,false,()=>false),false);
 assert.equal(presentTransientEvidence(p,false,false,()=>true),true);
 assert.equal(presentTransientEvidence(p,true,false,()=>false),true);
});
test('Stage 3: hidden flash/grenade/magazine meshes are not created or shown',()=>{
 const group=new THREE.Group(),mats=[];
 const visual=new BreachCombatEffectsPresenter(group,mats,false);
 const s={casings:[],seconds:1,
  dropped:[{id:1,p:{x:100,y:100},age:.1}],
  grenades:[{id:2,p:{x:120,y:120},age:.1}],
  flashBursts:[{id:3,p:{x:150,y:150},age:.1}]
 };
 visual.update(s,false,true,()=>true);
 assert.equal(visual.stats().magazines,0);
 assert.equal(visual.stats().grenades,0);
 assert.equal(visual.stats().flashes,0);
 visual.update(s,false,false,()=>true);
 assert.deepEqual([
  visual.stats().magazines,visual.stats().grenades,visual.stats().flashes
 ],[1,1,1]);
 visual.update(s,false,true,()=>true);
 assert.equal(group.children.filter(o=>
  o instanceof THREE.Mesh&&!o.isInstancedMesh&&o.visible).length,0);
 visual.reset();
 assert.equal(visual.stats().magazines,0);
 assert.equal(visual.stats().grenades,0);
 assert.equal(visual.stats().flashes,0);
});
test('Stage 3: hundreds of dropped magazines cannot create unbounded scene meshes',()=>{
 const group=new THREE.Group(),visual=new BreachCombatEffectsPresenter(group,[],false);
 const s={casings:[],grenades:[],flashBursts:[],seconds:3,
  dropped:Array.from({length:200},(_,i)=>({
    id:i,p:{x:i,y:100},age:2
  }))};
 visual.update(s,false,false,()=>true);
 assert.equal(visual.stats().magazines,MAX_DROPPED_MAGAZINE_VISUALS);
 s.dropped=s.dropped.slice(-3);
 visual.update(s,false,false,()=>true);
 assert.equal(visual.stats().magazines,3);
 visual.reset();assert.equal(visual.stats().magazines,0);
});
test('Stage 3: static batch reset releases instancing buffers once, not shared resources',()=>{
 const root=new THREE.Group(),owner=new THREE.Group(),parent=new THREE.Group();
 root.add(parent);
 const geometry=new THREE.BoxGeometry(1,1,1),material=new THREE.MeshStandardMaterial();
 for(let i=0;i<3;i++){
  const mesh=new THREE.Mesh(geometry,material);
  mesh.position.x=i*3;mesh.updateMatrixWorld(true);parent.add(mesh);
 }
 const batches=new StaticSceneBatches();
 batches.collect(owner,parent,new Set([geometry]));
 batches.flush(root);
 const instanced=root.children.find(o=>o instanceof THREE.InstancedMesh);
 assert.ok(instanced);
 let disposed=0,sharedDisposed=0;
 instanced.addEventListener('dispose',()=>disposed++);
 geometry.addEventListener('dispose',()=>sharedDisposed++);
 material.addEventListener('dispose',()=>sharedDisposed++);
 batches.clear();batches.clear();
 assert.equal(disposed,1);
 assert.equal(sharedDisposed,0);
 geometry.dispose();material.dispose();
});
test('Stage 3: obsolete hostiles can retire without destroying preloaded friendlies',()=>{
 const make=side=>({
  side,root:new THREE.Group(),status:new THREE.Mesh(),
  contactShadows:[]});
 const scene=new THREE.Scene(),blue=make('blue'),red=make('red');
 const actors=new Map([['blue',blue],['red',red]]),retired=[];
 for(const a of actors.values())scene.add(a.root);
 const host={scene,actors,civilianRigs:new Map(),
  actorIds:new Set(),civilianIds:new Set(),
  retireMissingHostile(id){
   retired.push(id);scene.remove(actors.get(id).root);actors.delete(id);
  }};
 reconcileSceneActorLifetimes({operators:[],civilians:[]},host,false,null);
 assert.deepEqual(retired,['red']);
 assert.equal(host.actors.size,1);
 assert.equal(host.actors.has('blue'),true);
 assert.equal(blue.root.visible,false);
});
