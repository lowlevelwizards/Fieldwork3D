import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCivilian} from '../src/breach-civilian-types.ts';
import {createCivilianRig,updateCivilianRig,disposeCivilianRig,
 civilianSharedWardrobe} from '../src/breach-civilian-visuals.ts';
import {reconcileSceneActorLifetimes} from '../src/rendering/breach-actor-frame-presenter.ts';
import {newSession} from '../src/breach-game.ts';
import {generateSite} from '../src/breach-site.ts';
import {auditSite} from '../src/breach-site-audit.ts';
import {activateSite} from '../src/breach-core.ts';
const make=(seed=12,role='employee')=>createCivilian({
 id:'civ:eqa2:'+seed,role,persona:'steady',activity:'working',
 position:{x:55,y:65},heading:.3,roomId:'room',appearanceSeed:seed
});
const finite=(rig)=>{
 let count=0;
 rig.root.traverse(node=>{
  if(!(node instanceof THREE.Mesh))return;
  count++;
  assert.ok(node.position.toArray().every(Number.isFinite));
 });
 return count;
};
test('EQA2 civilian uses actual shared operator 3D skeleton with a civilian-only outfit',()=>{
 const c=make(),r=createCivilianRig(c,true);
 try{
  assert.ok('character' in r);
  assert.equal(r.root,r.character.root);
  assert.equal(r.character.root.userData.civilianSharedCharacter,true);
  assert.equal(r.wardrobe.styles.headwear,'bare');
  assert.equal(r.wardrobe.styles.armorStyle,'armor-bare');
  assert.equal(r.wardrobe.styles.packStyle,'no-pack');
  assert.equal(r.equipment.slots.armor,'armor-none');
  updateCivilianRig(r,c,1);
  assert.equal(r.root.name,'civilian-'+c.id);
  assert.equal(r.character.weapon.visible,false);
  assert.equal(r.character.droppedGun.visible,false);
  assert.equal(r.character.pack.visible,false);
  assert.ok(finite(r)>15);
  assert.ok(Math.abs(r.root.position.x-c.p.x)<.001);
  assert.ok(Math.abs(r.root.position.z-c.p.y)<.001);
 }finally{disposeCivilianRig(r);}
});
test('EQA2 civilian animation resolves real gait, crouch, surrender, injury and down on shared rig',()=>{
 const c=make(71,'guest'),r=createCivilianRig(c,true);
 try{
  const scenes=[
   ['routine',0,2,0],['fleeing',62,2,.3],
   ['hiding',0,2,.6],['compliant',0,2,.9],
   ['escorted',19,1,1.2],['incapacitated',0,0,1.5],
   ['routine',0,2,.1]
  ];
  for(const [state,speed,health,time] of scenes){
   c.state=state;c.velocity=speed;c.health=health;
   c.injuryStage=health===0?3:health===1?1:0;
   updateCivilianRig(r,c,time);
   assert.ok(finite(r)>15);
   assert.equal(r.root.scale.y,1);
   assert.equal(r.character.weapon.visible,false);
  }
  assert.equal(r.character.lastPose?.down,false,
   'replay rewind clears old down pose without modifying civilian state');
  assert.equal(r.root.position.y,0);
  assert.notEqual(civilianSharedWardrobe(make(71)).styles.top,
   civilianSharedWardrobe(make(72,'guest')).styles.top);
 }finally{disposeCivilianRig(r);}
});
test('EQA2 reconciler creates one shared civilian rig and retires it when scene changes',()=>{
 const s=newSession(0,undefined,'full-view');
 const c=make(22);s.civilians=[c];
 const scene=new THREE.Scene();
 const host={scene,actors:new Map(),civilianRigs:new Map(),
  actorIds:new Set(),civilianIds:new Set()};
 try{
  reconcileSceneActorLifetimes(s,host,true,null);
  const rig=host.civilianRigs.get(c.id);
  assert.ok(rig&&'character' in rig);
  assert.equal(rig.root.parent,scene);
  s.civilians=[];
  reconcileSceneActorLifetimes(s,host,true,null);
  assert.equal(host.civilianRigs.size,0);
  assert.equal(rig.root.parent,null);
 }finally{for(const rig of host.civilianRigs.values())disposeCivilianRig(rig);
  activateSite(null);}
});
test('EQA2 prepared 11-archetype mission matrix retains safe physical scenarios and existing hostile budget',()=>{
 const rows=[];
 try{
  for(let seed=11;seed<=21;seed++)for(const mission of ['clear','intel','rescue','hold','capture']){
   const site=generateSite(seed,'small',undefined,{mission});
   const audit=auditSite(site);
   assert.deepEqual(audit.errors,[],seed+' '+mission);
   assert.equal(site.enemies.length,site.encounter.actors.length);
   rows.push({seed,building:site.archetype,mission,
    profile:site.encounter.profile,hostiles:site.encounter.actors.length,
    guards:site.encounter.actors.filter(a=>a.role!=='target'&&
     ['sentry','reserve','lookout'].includes(a.role)&&
     Math.hypot(a.position.x-site.objective.x,
      a.position.y-site.objective.y)<175).length});
   activateSite(null);
  }
  assert.equal(rows.length,55);
  assert.ok(rows.some(x=>x.profile==='prepared'&&x.mission==='hold'));
  console.log('EQA2_PREPARED_OBJECTIVE_MATRIX',JSON.stringify(
   rows.filter(x=>x.profile==='prepared'&&x.mission!=='clear')));
 }finally{activateSite(null);}
});
