import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIRST_PLACE,YARD_EQUIPMENT} from '../src/first-place-layout.ts';
import {createRecon,advanceRecon,reconView} from '../src/solo-recon.ts';
import {spawnActor,stepActor} from '../src/regional-actors.ts';
test('050: reading requires physical proximity and exit requires reading first',()=>{
  const sensor=YARD_EQUIPMENT.find(p=>p.type==='sensor');
  assert.ok(sensor);
  const start=createRecon(),gate={x:FIRST_PLACE.gate.x+4,z:FIRST_PLACE.gate.z};
  assert.equal(advanceRecon(start,gate,true).stage,'inspect');
  assert.equal(reconView(start,gate).action,null);
  assert.equal(advanceRecon(start,{x:-50,z:0},true).stage,'inspect');
  const here={x:sensor.x+1,z:sensor.z+1};
  assert.equal(reconView(start,here).action,'READ FIELD LOG');
  const read=advanceRecon(start,here,true);
  assert.equal(read.stage,'return');
  assert.equal(advanceRecon(read,{x:110,z:140}).stage,'return');
  assert.equal(advanceRecon(read,gate).stage,'complete');
});
test('050: crouching slows the same physical actor motor',()=>{
  const a=spawnActor('a','Rook','player',-220,170);
  const b=spawnActor('b','Rook','player',-220,170);
  b.stance='crouch';
  for(let i=0;i<80;i++){
    stepActor(a,1/60,{x:0,z:1});stepActor(b,1/60,{x:0,z:1});
  }
  assert.ok(Math.hypot(b.x+220,b.z-170)<Math.hypot(a.x+220,a.z-170));
});
test('050: solo UI owns scout controls and suppresses legacy world marker',()=>{
  const src=readFileSync(new URL('../src/world-main.ts',import.meta.url),'utf8');
  const html=readFileSync(new URL('../world.html',import.meta.url),'utf8');
  for(const id of ['fieldObjective','fieldGoal','fieldHint','fieldAction','stanceButton'])
    assert.ok(html.includes('id="'+id+'"'));
  assert.ok(src.includes('props=new CutwoodsPhysicalScene(scene,!soloMode)'));
  assert.ok(src.includes('recon=advanceRecon(recon,player)'));
  assert.ok(src.includes('player.vx*.37'));
});
