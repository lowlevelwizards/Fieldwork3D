import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parseBreachBootConfig} from '../src/breach-boot-config.ts';
import {shouldSubmitIdle3D} from '../src/rendering/breach-idle-3d-cadence.ts';
import {PausedShadowSceneController} from '../src/rendering/breach-shadow-controller.ts';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('mobile at-rest 3D has a long grace while execution, replay and inputs stay full-rate',()=>{
 const input={enabled:true,mode:'idle',viewMode:'iso',studioOccludes:false,
  now:2000,lastSceneAt:1983,lastSceneMode:'idle',sameSession:true,
  lastInputAt:1100,inputGraceMs:1200};
 assert.equal(shouldSubmitIdle3D(input),true,'recent input: full-rate');
 assert.equal(shouldSubmitIdle3D({...input,lastInputAt:500}),false,'settled idle may skip');
 assert.equal(shouldSubmitIdle3D({...input,lastInputAt:500,lastSceneAt:1960}),true);
 for(const mode of ['live','replay','suspended'])
  assert.equal(shouldSubmitIdle3D({...input,mode,lastInputAt:500}),true,mode);
 assert.equal(shouldSubmitIdle3D({...input,mode:'idle',lastSceneMode:'live',lastInputAt:500}),true);
 assert.equal(shouldSubmitIdle3D({...input,mode:'idle',sameSession:false,lastInputAt:500}),true);
 assert.equal(parseBreachBootConfig('?idle3d=60').idle3dDisabled,true);
 assert.equal(parseBreachBootConfig('?idle3d=30').idle3dExperiment,true);
 const code=source('src/breach-runtime-loop.ts');
 assert.match(code,/matchMedia\('\(pointer:coarse\)'\)/);
 assert.match(code,/last3dMode!=='idle'\|\|last3dSession!==state/);
 assert.match(code,/inputGraceMs:idle3dAuto\?1200:undefined/);
 assert.match(code,/if\(updated3d&&stage\)/);
 assert.match(code,/if\(!studioOccludesTactical\)config.renderFrame\(dt\)/);
});
test('paused shadow reuse responds to actual scalar, door and saved wardrobe edits',()=>{
 const operator={id:'rook',p:{x:40,y:60},heading:0,posture:'stand',
  health:4,weaponYaw:0,recoil:0,reload:0,stride:0,
  weapon:'carbine',equipment:{slots:{helmet:'ach'}},
  wardrobe:{shirt:'combat'}};
 const door={id:'d1',open:false,openFraction:0};
 let appearanceKey='ach/combat';
 let queries=0;
 const scene={site:3,phase:'planning',selected:'rook',focusX:40,focusY:60,
  objectRevision:0,known:10,intelMode:'true-blind',lighting:'day',
  actors:[operator],doors:[door],poseTime:0,simulationTime:3,
  appearanceKey:()=>{queries++;return appearanceKey;}};
 const c=new PausedShadowSceneController();
 assert.equal(c.shouldRefresh(false,scene),true);
 for(let frame=0;frame<360;frame++)
  assert.equal(c.shouldRefresh(false,scene),false);
 assert.equal(c.refreshes,1);
 assert.equal(c.reuses,360);
 assert.equal(queries,361,'uses prebuilt appearance key, no extra serialization');
 operator.wardrobe.shirt='polo';appearanceKey='ach/polo';
 assert.equal(c.shouldRefresh(false,scene),true,'in-place outfit edit invalidates');
 assert.equal(c.shouldRefresh(false,scene),false);
 door.openFraction=.6;
 assert.equal(c.shouldRefresh(false,scene),true,'moving door invalidates');
 operator.heading=.4;
 assert.equal(c.shouldRefresh(false,scene),true,'pose invalidates');
 scene.known+=1;
 assert.equal(c.shouldRefresh(false,scene),true,'intel state invalidates');
 assert.equal(c.shouldRefresh(true,scene),true,'combat always refreshes');
 assert.equal(c.shouldRefresh(false,scene),true,'return to planning refreshes');
 c.invalidate();
 assert.equal(c.shouldRefresh(false,scene),true);
});
test('shadow preparation tracks mutable appearance even before first rig is available',()=>{
 const c=new PausedShadowSceneController();
 const actor={id:'late',p:{x:0,y:0},heading:0,posture:'stand',
  health:4,weaponYaw:0,recoil:0,reload:0,stride:0,weapon:'carbine',
  equipment:{slots:{armor:'soft'}},wardrobe:{shirt:'polo'}};
 const scene={site:1,phase:'planning',selected:'late',focusX:0,focusY:0,
  objectRevision:0,known:0,intelMode:'true-blind',lighting:'day',
  actors:[actor],doors:[],poseTime:0,simulationTime:0,
  appearanceKey:()=>undefined};
 assert.equal(c.shouldRefresh(false,scene),true);
 assert.equal(c.shouldRefresh(false,scene),false);
 actor.equipment.slots.armor='heavy';
 assert.equal(c.shouldRefresh(false,scene),true);
});
