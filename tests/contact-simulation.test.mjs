import test from 'node:test';
import assert from 'node:assert/strict';
import {ContactSimulation,obstruction,visible} from '../src/combat/contact-simulation.ts';
test('physical cover blocks player AND patrol fire',()=>{
 const wall=[{kind:'box',x:5,z:0,halfX:1,halfZ:2}];
 assert.ok(obstruction({x:0,z:0},{x:10,z:0},wall));
 assert.equal(visible({x:0,z:0},{x:10,z:0},wall),false);
 assert.equal(visible({x:0,z:4},{x:10,z:4},wall),true);
 const c=new ContactSimulation(wall);
 c.setPosition('rook',{x:0,z:0});c.setPosition('patrol-a',{x:10,z:0});
 const shot=c.fire('rook','patrol-a');
 assert.equal(shot.blocked,true);
 assert.equal(shot.hit,false);
 assert.equal(c.fighters['patrol-a'].hp,100);
 c.update(.5);
 const reverse=c.fire('patrol-a','rook');
 assert.equal(reverse.blocked,true);
 assert.equal(c.fighters.rook.hp,100);
});
test('finite magazine, reload time, ammo consumption and non-friendly fire',()=>{
 const c=new ContactSimulation([]);
 c.setPosition('rook',{x:0,z:0});c.setPosition('patrol-a',{x:4,z:0});
 assert.equal(c.fire('rook','mica'),null);
 let fired=0;
 for(let i=0;i<9;i++){
  const shot=c.fire('rook','patrol-a');if(shot)fired++;
  c.fighters['patrol-a'].hp=100;
  for(let n=0;n<10;n++)c.update(.05);
 }
 assert.equal(fired,9);assert.equal(c.fighters.rook.ammo,0);
 assert.equal(c.fire('rook','patrol-a'),null);
 assert.ok(c.fighters.rook.reload>0);
 for(let i=0;i<40;i++)c.update(.05);
 assert.equal(c.fighters.rook.ammo,9);
 assert.equal(c.fighters.rook.reserve,27);
});
test('patrol only sees targets within cone, range and obstruction',()=>{
 const sim=new ContactSimulation([]);
 sim.setPosition('patrol-a',{x:0,z:0},0);
 sim.setPosition('mica',{x:38,z:25});
 sim.setPosition('rook',{x:0,z:-11});
 sim.update(.05);
 assert.equal(sim.fighters['patrol-a'].state,'unaware');
 sim.setPosition('rook',{x:0,z:10});
 sim.update(.05);
 assert.equal(sim.fighters['patrol-a'].state,'engaged');
 assert.equal(sim.fighters['patrol-a'].memory>0,true);
});
test('gunshot noise causes suspicion and search even without clear sight',()=>{
 const sim=new ContactSimulation([{kind:'box',x:5,z:0,halfX:1,halfZ:2}]);
 sim.setPosition('rook',{x:0,z:0});sim.setPosition('mica',{x:38,z:25});
 sim.setPosition('patrol-a',{x:10,z:0},0);
 sim.fire('rook','patrol-a');
 assert.equal(sim.fighters['patrol-a'].state,'suspicious');
 for(let i=0;i<220;i++)sim.update(.05);
 assert.equal(sim.fighters['patrol-a'].state,'searching');
});
test('suppression and injuries have real persisted values, patrol ends when both down',()=>{
 const sim=new ContactSimulation([]);
 sim.setPosition('rook',{x:0,z:0});sim.setPosition('patrol-a',{x:2,z:0});
 for(let j=0;j<4;j++){
  sim.fighters.rook.cooldown=0;
  sim.fire('rook','patrol-a');
 }
 assert.ok(sim.fighters['patrol-a'].hp<=100);
 assert.ok(sim.fighters['patrol-a'].suppressed>0);
 sim.fighters['patrol-a'].hp=0;sim.fighters['patrol-b'].hp=0;
 assert.equal(sim.patrolAlive,false);
 assert.equal(sim.resolved,true);
});

test('downed crew can receive nearby aid outside visible enemy fire',()=>{
 const c=new ContactSimulation([{kind:'box',x:5,z:0,halfX:1,halfZ:2}]);
 c.setPosition('rook',{x:0,z:0});c.setPosition('mica',{x:1.4,z:0});
 c.setPosition('patrol-a',{x:10,z:0});c.setPosition('patrol-b',{x:27,z:0});
 c.fighters.mica.hp=0;c.fighters.mica.state='down';
 assert.equal(c.revive('rook','mica'),true);
 assert.equal(c.fighters.mica.hp,34);
 assert.ok(c.fighters.mica.suppressed>0);
 c.reset();
 assert.equal(c.fighters.mica.hp,100);
 assert.equal(c.active,false);
});
