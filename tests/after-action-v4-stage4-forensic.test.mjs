import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {shadowHitAnatomy,legacyAnatomy,validHitAnatomy,
 recordedHitAnatomy} from '../src/breach-hit-anatomy.ts';
import {inspectForensicEvidence} from '../src/breach-forensic-evidence.ts';
import {viewShot,buildAfterActionReport} from '../src/breach-after-action-report.ts';
import {renderHitPaperDoll} from '../src/ui/breach-hit-paper-doll.ts';
import {createForensicModelOverlay} from
 '../src/ui/breach-after-action-anatomy-overlay.ts';
import {newSession} from '../src/breach-game.ts';
import {MissionRecorder} from '../src/breach-replay.ts';
import {captureReplayArchive,restoreReplayArchive,replayArchiveIsValid}
 from '../src/breach-replay-archive.ts';
import {buildReplayReport} from '../src/breach-replay-export-json.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const proxy=(offset,region='arm',heading=0)=>
 shadowHitAnatomy({muzzle:{x:-100,y:offset},target:{x:0,y:0},
   shotYaw:0,targetHeading:heading,hitRadius:10,region});
const shot=(id,region,side,outcome='damaging')=>({
 id,at:id,shooterId:'rook',targetId:'moss',
 region,outcome,precision:side==='unknown'?'region-only':'proxy',
 anatomy:side==='unknown'?legacyAnatomy(region):{
  schemaVersion:1,region,side,source:'trajectory-proxy',
  lateral:side==='left'?-0.6:0.6,forward:-0.8},
 down:false,damage:outcome==='damaging'?1:0,
 weapon:'carbine',caliber:null,receiver:null
});
const contact=(shots,id='moss')=>({
 id,name:id.toUpperCase(),side:'blue',resolution:'unresolved',
 resolvedAt:null,firstSeenAt:null,finalShotId:null,shots
});
class Element{
 constructor(tag){this.tag=tag;this.className='';
  this.textContent='';this.attrs=new Map();this.children=[];}
 setAttribute(name,value){this.attrs.set(name,String(value));}
 getAttribute(name){return this.attrs.get(name)??null;}
 append(...children){this.children.push(...children);}
}
function withDom(fn){
 const prior=globalThis.document;
 globalThis.document={createElement:tag=>new Element(tag),
  createElementNS:(ns,tag)=>new Element(tag)};
 try{return fn();}
 finally{if(prior===undefined)delete globalThis.document;
  else globalThis.document=prior;}
}
function descendants(root,predicate){
 return [root,...root.children.flatMap(c=>descendants(c,predicate))]
  .filter(predicate);
}
const part=(root,key)=>descendants(root,n=>n.getAttribute?.(
  'data-anatomy-part')===key);
const fullText=root=>root.textContent+root.children.map(fullText).join('');

test('V4-4 side proxy is deterministic, heading-relative and never invents center-line laterality',()=>{
 const left=proxy(-6),right=proxy(6),center=proxy(0);
 assert.equal(left.side,'left');assert.equal(right.side,'right');
 assert.equal(center.side,'unknown');
 assert.equal(proxy(-6,'arm',Math.PI).side,'right');
 assert.equal(proxy(-6,'torso').side,'unknown');
 assert.deepEqual(proxy(-6),left);
 assert.ok(left.lateral<-.32&&right.lateral>.32);
 assert.equal(left.source,'trajectory-proxy');
 assert.deepEqual(proxy(100),legacyAnatomy('arm'),
   'off-body proxy observation must not fabricate a side');
 const shotResolution=source('src/breach-shot-resolution.ts');
 assert.match(shotResolution,/hitAnatomy:hit\?shadowHitAnatomy/);
 assert.match(shotResolution,/const hit=wouldHitTarget&&!civilianHit/);
 assert.ok(shotResolution.indexOf('const region=hitRegion(shotId)')<
   shotResolution.indexOf('hitAnatomy:hit?shadowHitAnatomy'));
});

test('V4-4 provenance validation rejects forged, malformed or inconsistent limb side',()=>{
 const observed=proxy(-6);
 assert.equal(validHitAnatomy(observed,'arm'),true);
 assert.equal(validHitAnatomy({...observed,region:'leg'},'arm'),false);
 assert.equal(validHitAnatomy({...observed,side:'right'},'arm'),false);
 assert.equal(validHitAnatomy({...observed,lateral:3},'arm'),false);
 assert.equal(validHitAnatomy({...observed,source:'legacy-region'},'arm'),false);
 assert.equal(validHitAnatomy({...observed,schemaVersion:9},'arm'),false);
 assert.equal(recordedHitAnatomy({hit:false,hitRegion:'arm',
   hitAnatomy:observed}),null);
 assert.deepEqual(recordedHitAnatomy({hit:true,hitRegion:'arm'}),
   legacyAnatomy('arm'));
 assert.deepEqual(recordedHitAnatomy({hit:true,hitRegion:'arm',
   hitAnatomy:observed}),observed);
});

test('V4-4 shot projection preserves canonical identity, time and nonlocalizing legacy precision',()=>{
 const fresh={
  id:71,recordedAt:8.5,shooterId:'rook',targetId:'moss',
  hit:true,hitRegion:'arm',hitAnatomy:proxy(-6),
  healthBefore:4,healthAfter:3,down:false,
  start:{x:-100,y:-6},end:{x:0,y:0}
 };
 const projected=viewShot(fresh);
 assert.equal(projected.id,71);
 assert.equal(projected.at,8.5);
 assert.equal(projected.shooterId,'rook');
 assert.equal(projected.targetId,'moss');
 assert.equal(projected.anatomy.side,'left');
 assert.equal(projected.precision,'proxy');
 assert.equal(projected.outcome,'damaging');
 const legacy=viewShot({...fresh,hitAnatomy:undefined});
 assert.equal(legacy.precision,'region-only');
 assert.equal(legacy.anatomy.side,'unknown');
 assert.equal(legacy.anatomy.lateral,null);
 const armor=viewShot({...fresh,healthAfter:4,surface:'metal'});
 assert.equal(armor.outcome,'armor-stopped');
});

test('V4-4 selected shot and cumulative through-shot evidence cannot mix armor with wounds',()=>{
 const shots=[
  shot(1,'arm','left'),shot(2,'arm','right'),
  shot(3,'torso','unknown','armor-stopped'),
  shot(4,'leg','unknown')];
 const c=contact(shots);
 const first=inspectForensicEvidence(c,1,'cumulative');
 assert.deepEqual([...first.slots.keys()],['arm-left']);
 assert.equal(first.damaged.length,1);
 const through=inspectForensicEvidence(c,3,'cumulative');
 assert.deepEqual([...through.slots.keys()],['arm-left','arm-right']);
 assert.equal(through.armorStops.length,1);
 assert.equal(through.slots.get('torso'),undefined);
 const selected=inspectForensicEvidence(c,3,'selected');
 assert.equal(selected.damaged.length,0);
 assert.equal(selected.armorStops.length,1);
 assert.equal(selected.slots.size,0);
 const unknown=inspectForensicEvidence(c,4,'selected');
 assert.equal(unknown.unknownLimb.length,1);
 assert.equal(unknown.slots.size,0);
 assert.equal(unknown.activeShot.id,4);
});

test('V4-4 front/back 2D left-only arm hits never highlight the other arm',()=>withDom(()=>{
 const c=contact([shot(1,'arm','left')]);
 const front=renderHitPaperDoll(c,1,false,'cumulative');
 const back=renderHitPaperDoll(c,1,true,'cumulative');
 assert.equal(part(front,'arm-left')[0].getAttribute('fill'),'#ddc77c');
 assert.equal(part(front,'arm-right')[0].getAttribute('fill'),'#efeee8');
 assert.equal(part(back,'arm-left')[0].getAttribute('fill'),'#ddc77c');
 assert.equal(part(back,'arm-right')[0].getAttribute('fill'),'#efeee8');
 assert.equal(part(front,'arm-left')[0].getAttribute('x'),'119');
 assert.equal(part(back,'arm-left')[0].getAttribute('x'),'25');
 assert.equal(part(front,'arm-right')[0].getAttribute('x'),'25');
 assert.equal(part(back,'arm-right')[0].getAttribute('x'),'119');
}));

test('V4-4 known leg side, unknown side and armor stop remain truthful on paper',()=>withDom(()=>{
 const unknown=contact([shot(1,'leg','unknown')]);
 const paper=renderHitPaperDoll(unknown,1,false,'selected');
 assert.equal(part(paper,'leg-left')[0].getAttribute('fill'),'#efeee8');
 assert.equal(part(paper,'leg-right')[0].getAttribute('fill'),'#efeee8');
 assert.match(fullText(paper),/SIDE UNCERTAIN/);
 assert.equal(descendants(paper,n=>n.getAttribute?.(
   'data-unknown-limb-count')==='1').length,1);
 const armor=renderHitPaperDoll(contact([
  shot(2,'torso','unknown','armor-stopped')]),2,false,'cumulative');
 assert.equal(part(armor,'torso')[0].getAttribute('fill'),'#efeee8');
 assert.match(fullText(armor),/ARMOR STOP/);
 assert.match(fullText(armor),/NO TISSUE WOUND/);
 const leg=renderHitPaperDoll(contact([shot(3,'leg','right')]),3,true,'selected');
 assert.equal(part(leg,'leg-right')[0].getAttribute('fill'),'#ddc77c');
 assert.equal(part(leg,'leg-left')[0].getAttribute('fill'),'#efeee8');
}));

test('V4-4 3D bands attach only to canonical rig side and hide on unknown/armor evidence',()=>{
 const rig={
  head:new THREE.Group(),chest:new THREE.Group(),
  arms:[{upper:new THREE.Group()},{upper:new THREE.Group()}],
  feet:[{upper:new THREE.Group()},{upper:new THREE.Group()}]
 };
 const overlay=createForensicModelOverlay(rig);
 const left=rig.arms[0].upper.children[0];
 const right=rig.arms[1].upper.children[0];
 assert.equal(left.name,'after-action-evidence-arm-left');
 assert.equal(right.name,'after-action-evidence-arm-right');
 assert.equal(left.visible,false);assert.equal(right.visible,false);
 overlay.update(inspectForensicEvidence(contact([shot(1,'arm','left')]),
   1,'cumulative'));
 assert.equal(left.visible,true);
 assert.equal(right.visible,false);
 overlay.update(inspectForensicEvidence(contact([shot(2,'arm','unknown')]),
   2,'selected'));
 assert.equal(left.visible,false);assert.equal(right.visible,false);
 overlay.update(inspectForensicEvidence(contact([
   shot(3,'arm','left','armor-stopped')]),3,'cumulative'));
 assert.equal(left.visible,false);assert.equal(right.visible,false);
 overlay.update(null);assert.equal(left.visible,false);
 rig.arms[0].upper.traverse(obj=>{
  if(obj.isLineSegments){obj.geometry.dispose();obj.material.dispose();}
 });
 rig.arms[1].upper.traverse(obj=>{
  if(obj.isLineSegments){obj.geometry.dispose();obj.material.dispose();}
 });
});

test('V4-4 injured but surviving operators are visible in Squad Combat and report is immutable',()=>{
 const sourceShot={id:4,recordedAt:7,shooterId:'guard',targetId:'moss',
  hit:true,hitRegion:'arm',hitAnatomy:proxy(-6),
  healthBefore:4,healthAfter:3,down:false,start:{x:0,y:0},end:{x:1,y:0}};
 const rec={manifest:{actors:[
  {id:'moss',name:'MOSS',side:'blue'},
  {id:'rook',name:'ROOK',side:'blue'},
  {id:'guard',name:'GUARD',side:'red'}]},
  ballistics:{shots:[sourceShot]},events:[],
  frames:[{actors:[{id:'moss',health:3,injuryStage:1},
    {id:'rook',health:4,injuryStage:0}]}],
  completeness:{complete:true},duration:9};
 const before=structuredClone(rec);
 const r=buildAfterActionReport(rec);
 assert.deepEqual(rec,before);
 assert.equal(r.friendlyCasualties.length,1);
 assert.equal(r.friendlyCasualties[0].id,'moss');
 assert.equal(r.friendlyCasualties[0].shots[0].anatomy.side,'left');
 assert.equal(r.friendlyCasualties[0].resolution,'unresolved');
 assert.equal(r.operators.find(x=>x.id==='moss').status,'wounded');
});

test('V4-4 archive V1 roundtrip preserves optional anatomy while rejecting corrupt claims',()=>{
 const state=newSession(0,418),rec=new MissionRecorder();
 rec.capture(state,true);state.seconds=.05;rec.capture(state,true);
 const evidence=proxy(-6);
 const shotRecord={id:91,shooterId:'rook',targetId:'guard',
  start:{x:-100,y:-6},end:{x:0,y:0},age:0,
  recordedAt:.03,hit:true,side:'blue',healthBefore:4,healthAfter:3,
  down:false,hitRegion:'arm',hitAnatomy:evidence,surface:'blood'};
 rec.ballistics.shots.push(shotRecord);
 const archive=captureReplayArchive(rec,'forensic-stage4',12345);
 assert.equal(replayArchiveIsValid(archive),true);
 const replay=restoreReplayArchive(archive);
 assert.deepEqual(replay.ballistics.shots[0].hitAnatomy,evidence);
 const exported=buildReplayReport(replay).shots[0];
 assert.deepEqual(exported.anatomy,evidence);
 assert.equal(exported.sideEvidence,'left');
 assert.equal(exported.precision,'proxy');
 const bad=structuredClone(archive);
 bad.shots[0].hitAnatomy.lateral=Number.POSITIVE_INFINITY;
 assert.equal(replayArchiveIsValid(bad),false);
 const mismatched=structuredClone(archive);
 mismatched.shots[0].hitAnatomy.side='right';
 assert.equal(replayArchiveIsValid(mismatched),false);
 const old=structuredClone(archive);
 delete old.shots[0].hitAnatomy;
 assert.equal(replayArchiveIsValid(old),true);
 assert.equal(restoreReplayArchive(old).ballistics.shots[0].hitAnatomy,
  undefined);
 assert.equal(buildReplayReport(restoreReplayArchive(old)).shots[0]
   .sideEvidence,'unknown');
});

test('V4-4 renderer, Combat scope and replay return share authoritative evidence',()=>{
 const controller=source('src/ui/breach-after-action-controller.ts');
 const model=source('src/ui/breach-after-action-model.ts');
 const combat=source('src/ui/breach-after-action-combat.ts');
 const paper=source('src/ui/breach-hit-paper-doll.ts');
 assert.match(controller,/forensicScope:'cumulative'/);
 assert.match(controller,/chooseScope:\(scope\)=>\{s\.forensicScope=scope;draw\(\);\}/);
 assert.match(controller,/forensicScope:s\.forensicScope/);
 assert.match(controller,/s\.forensicScope=context\.forensicScope\?\?'cumulative'/);
 assert.match(controller,/inspectForensicEvidence\(contact/);
 assert.match(controller,/presenter\.setEvidence\(evidence\)/);
 assert.match(controller,/currentCombatEvidence\(root\)/);
 assert.match(model,/createForensicModelOverlay\(rig\)/);
 assert.match(model,/model\.overlay\.update/);
 assert.match(combat,/renderHitPaperDoll\(active,selected\?\.id\?\?null,view\.back,/);
 assert.match(combat,/inspectForensicEvidence\(active,selected\?\.id\?\?null,/);
 assert.match(paper,/inspectForensicEvidence\(contact,selectedShotId,scope\)/);
 assert.match(combat,/SHOT #/);
 assert.match(combat,/viewReplay\(active,selected\)/);
});
