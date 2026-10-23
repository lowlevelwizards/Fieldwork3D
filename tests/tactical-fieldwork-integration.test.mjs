import test from 'node:test';
import assert from 'node:assert/strict';
import {ContactSimulation} from '../src/combat/contact-simulation.ts';
import {CrewMission} from '../src/crew/crew-mission.ts';
import {NetworkJob} from '../src/fieldwork/network-job.ts';
test('combat interruption does not erase a diagnosed infrastructure obligation',()=>{
 const job=new NetworkJob(0),crew=new CrewMission();
 const contact=new ContactSimulation([]);
 job.inspect('generator');
 assert.equal(crew.diagnose('terminal'),true);
 for(let i=0;i<28;i++)crew.advance(.05,true,false,false);
 assert.equal(crew.stage,'delivering');
 contact.setPosition('rook',{x:0,z:0});
 contact.setPosition('patrol-a',{x:4,z:0});
 contact.fire('patrol-a','rook');
 assert.equal(contact.active,true);
 assert.equal(crew.stage,'delivering');
 assert.equal(job.phase,'diagnosed');
 for(let i=0;i<29;i++)crew.advance(.05,false,true,false);
 assert.equal(crew.stage,'delivered');
 assert.equal(crew.rookHasFuse,true);
 assert.equal(job.network.generatorRunning,false);
});
test('real cover physically protects a working operator under fire',()=>{
 const obstacles=[{kind:'box',x:0,z:0,halfX:1.2,halfZ:2.2}];
 const sim=new ContactSimulation(obstacles);
 sim.setPosition('rook',{x:-4,z:0});
 sim.setPosition('patrol-a',{x:4,z:0});
 for(let i=0;i<3;i++){
   sim.fighters['patrol-a'].cooldown=0;
   const shot=sim.fire('patrol-a','rook');
   assert.equal(shot.blocked,true);
 }
 assert.equal(sim.fighters.rook.hp,100);
});
