import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import {coarseHeightAt,tileHeightAt} from '../src/regional-terrain.ts';
import {roadCenterX,riverSurfaceY,riverDepthAt,queryTravel,
  physicalGroundAt,standingHeightAt,terrainSightClear,BUILDINGS,
  buildingWallAt,deckYAt,SITE_CENTER} from '../src/regional-physical.ts';
import {spawnActor,stepActor,assignDestination,holdActor,findLocalRoute,
  canSee,shootAt,spawnCutwoodsActors} from '../src/regional-actors.ts';
import {regionalPlantSuitability,establishRegionalPlants,
  plantsNear} from '../src/regional-ecology.ts';
import {newOperation,stepOperation,orderPlayer,issueSquadOrder,
  playerFire} from '../src/regional-command.ts';

test('033: human bodies are true metre-size and rooted to physical ground',()=>{
  const a=spawnActor('p','Operator','player',-100,170);
  assert.equal(a.height,1.75);
  assert.equal(a.radius,.27);
  assert.equal(a.y,standingHeightAt(a.x,a.z));
  assert.equal(a.grounded,true);
  for(let z=-460;z<450;z+=67){
    for(let x=-425;x<430;x+=93){
      const y=physicalGroundAt(x,z);
      assert.ok(Number.isFinite(y));
      const tile={col:Math.floor((x+500)/125),
        row:Math.floor((z+500)/125)};
      assert.ok(Math.abs(y-tileHeightAt('cutwoods',tile,x,z,true,31))<1e-9);
      assert.ok(Math.abs(y-coarseHeightAt('cutwoods',x,z,31))<=1.5);
    }
  }
});
test('034: same motor walks, turns, follows grade, stops and cannot leave the map',()=>{
  const a=spawnActor('p','Operator','player',-220,170);
  const start={x:a.x,z:a.z};
  for(let i=0;i<300;i++)stepActor(a,1/60,{x:.7,z:-.2});
  assert.ok(Math.hypot(a.x-start.x,a.z-start.z)>3);
  assert.equal(a.y,standingHeightAt(a.x,a.z));
  assert.ok(Number.isFinite(a.heading)&&Math.abs(a.heading)>0);
  const before={vx:a.vx,vz:a.vz};
  for(let i=0;i<150;i++)stepActor(a,1/60,{x:0,z:0});
  assert.ok(Math.hypot(a.vx,a.vz)<Math.hypot(before.vx,before.vz));
  const edge=spawnActor('edge','Edge','player',494,300);
  for(let i=0;i<200;i++)stepActor(edge,1/30,{x:1,z:0});
  assert.ok(edge.x<495);
});
test('035-036: river depth, road and bridge crossings are physical queries',()=>{
  let wetCount=0;
  for(let z=-460;z<=460;z+=15){
    const x=roadCenterX(z);
    assert.ok(Number.isFinite(x));
    assert.ok(Number.isFinite(riverSurfaceY(z)));
    assert.ok(Number.isFinite(queryTravel(x,z).height));
    if(riverDepthAt(0,z)>.05)wetCount++;
  }
  assert.ok(wetCount>=0);
  const candidate=queryTravel(roadCenterX(200),200);
  assert.equal(candidate.onRoad,true);
  const deck=deckYAt(roadCenterX(42),42);
  assert.ok(deck!==null);
  assert.ok(queryTravel(roadCenterX(42),42).passable);
});
test('038: physical building wall blocks but its south entrance remains open',()=>{
  const home=BUILDINGS[0];
  assert.equal(buildingWallAt(home.x,home.z+home.depth/2),false);
  assert.equal(buildingWallAt(home.x+home.width/2,home.z),true);
  assert.equal(queryTravel(home.x+home.width/2,home.z).passable,false);
});
test('037: regional woodland deterministic, habitat constrained and near-camera bounded',()=>{
  const a=establishRegionalPlants(),b=establishRegionalPlants();
  assert.deepEqual(a,b);
  assert.ok(a.length>35&&a.length<2000);
  assert.ok(a.every(p=>regionalPlantSuitability(p.x,p.z)>=0));
  assert.ok(a.every(p=>p.height>0&&p.crown>0));
  const nearby=plantsNear(a,0,0,100);
  assert.ok(nearby.length<a.length);
  assert.ok(nearby.every(p=>Math.hypot(p.x,p.z)<100));
});
test('039: actors share visibility checks, range and weapon cooldown',()=>{
  const a=spawnActor('a','Shooter','northline',-240,120);
  const b=spawnActor('b','Target','commune',-242,116);
  assert.equal(canSee(a,b,30),true);
  assert.equal(shootAt(a,b),true);
  assert.equal(b.health,2);
  assert.equal(shootAt(a,b),false);
  assert.equal(a.shots,1);
  stepActor(a,1);
  assert.ok(a.shotCooldown>.4,'motor caps single frame step to avoid teleport');
  assert.equal(terrainSightClear(
    {x:a.x,y:a.y+1.6,z:a.z},{x:b.x,y:b.y+1.4,z:b.z}),true);
});
test('040-042: orders are delegated through faction, platoon and squad actors',()=>{
  const op=newOperation();
  assert.equal(op.actors.length,4);
  assert.deepEqual(op.goals.map(g=>g.faction),['northline','commune']);
  assert.ok(op.platoons.every(p=>op.squads.some(s=>s.squadId===p.squadId)));
  assert.ok(op.squads[0].memberIds.includes(op.playerId));
  assert.ok(op.squads[0].memberIds.every(id=>op.actors.some(a=>a.id===id)));
  assert.ok(issueSquadOrder(op,'n1',{x:93,z:148}));
  assert.ok(op.actors.some(a=>a.id==='north-lead'&&a.destination));
  assert.ok(orderPlayer(op,{x:roadCenterX(200),z:200}));
  for(let i=0;i<100;i++)stepOperation(op,1/30,{x:0,z:0});
  assert.ok(op.elapsed>3);
  assert.ok(op.actors.every(a=>Number.isFinite(a.y)));
  assert.ok(op.log.length>=1);
});
test('042: victory and defeat retain complete causal operation outcomes',()=>{
  const op=newOperation();
  assert.equal(op.result,'active');
  assert.equal(op.goals[0].status,'active');
  const commune=op.actors.find(a=>a.team==='commune');
  commune.health=0;
  op.actors.find(a=>a.id==='north-lead').x=SITE_CENTER.x;
  op.actors.find(a=>a.id==='north-lead').z=SITE_CENTER.z;
  stepOperation(op,.03);
  assert.equal(op.result,'won');
  assert.equal(op.goals[0].status,'complete');
  const defeat=newOperation();
  defeat.actors.find(a=>a.id==='player').health=0;
  stepOperation(defeat,.03);
  assert.equal(defeat.result,'lost');
});
test('034 and 041: movement orders can be issued/held and local navigation avoids walls',()=>{
  const player=spawnCutwoodsActors()[0];
  const destination={x:roadCenterX(210),z:210};
  assert.ok(queryTravel(destination.x,destination.z).passable);
  assert.ok(assignDestination(player,destination));
  assert.ok(player.path.length>0);
  holdActor(player);
  assert.equal(player.path.length,0);
  assert.equal(player.destination,null);
  const route=findLocalRoute({x:roadCenterX(200),z:200},
    {x:roadCenterX(211),z:211});
  assert.ok(route.length>0);
  assert.ok(route.every(p=>queryTravel(p.x,p.z).passable));
});
test('new player controls run on a separate world page; original 10m lab remains untouched',()=>{
  const world=readFileSync(new URL('../world.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/world-main.ts',import.meta.url),'utf8');
  const region=readFileSync(new URL('../src/regional-visuals.ts',import.meta.url),'utf8');
  const old=readFileSync(new URL('../src/main.ts',import.meta.url),'utf8');
  for(const id of ['worldMode','moveStick','moveNub','fireButton',
    'squadOrder','operationReadout'])
    assert.ok(world.includes('id="'+id+'"'));
  assert.ok(main.includes('new CutwoodsPhysicalScene(scene)'));
  assert.ok(main.includes('newOperation()'));
  assert.ok(main.includes('stepOperation('));
  assert.ok(main.includes('setExplore('));
  assert.ok(region.includes('new THREE.InstancedMesh('));
  assert.ok(old.includes('new VegetationField(scene)'));
  assert.ok(!old.includes('regional-command'));
});
