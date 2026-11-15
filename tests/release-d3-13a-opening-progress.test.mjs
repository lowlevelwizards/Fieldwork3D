import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {openingHasStagnated,OPENING_PROGRESS_GRACE_SECONDS}
 from '../src/breach-door-opening-progress.ts';
const door=()=>({id:'D',open:true,openFraction:.32,angularVelocity:.5,
 locked:false,wedged:false,heldBy:null,kind:'hinged'});
test('D3.13A: noisy angular velocity cannot disguise an unchanged real aperture',()=>{
 const d=door();
 for(let i=0;i<155;i++){
  d.angularVelocity=i%2?-.75:.75;
  assert.equal(openingHasStagnated(d,i/60),false);
 }
 assert.equal(openingHasStagnated(d,OPENING_PROGRESS_GRACE_SECONDS+.05),true);
 // Merely observing it repeatedly does not renew the expiry.
 assert.equal(openingHasStagnated(d,OPENING_PROGRESS_GRACE_SECONDS+.22),true);
});
test('D3.13A: actual angular opening progress resets the watchdog',()=>{
 const d=door();
 for(let tick=0;tick<=138;tick++)
  assert.equal(openingHasStagnated(d,tick/60),false);
 // A real angular change, unlike velocity alone, extends the grace.
 d.openFraction+=.04;
 assert.equal(openingHasStagnated(d,2.35),false);
 for(let t=2.45;t<4.95;t+=.1)openingHasStagnated(d,t);
 assert.equal(openingHasStagnated(d,4.95),false);
 assert.equal(openingHasStagnated(d,5.05),true);
});
test('D3.13A: new door, replay seek, reclosed leaf and unavailable hardware reset',()=>{
 const d=door(),other=door();
 for(let t=1;t<3.75;t+=.1)openingHasStagnated(d,t);
 assert.equal(openingHasStagnated(d,3.8),true);
 assert.equal(openingHasStagnated(other,3.8),false);
 assert.equal(openingHasStagnated(d,0),false,'replay seeking backwards');
 assert.equal(openingHasStagnated(d,.5),false);
 d.open=false;assert.equal(openingHasStagnated(d,10),false);
 d.open=true;assert.equal(openingHasStagnated(d,10.05),false);
 d.openFraction=.2;
 assert.equal(openingHasStagnated(d,10.1),false);
 for(const blocker of ['locked','wedged','heldBy']){
  d[blocker]=blocker==='heldBy'?'operator':true;
  assert.equal(openingHasStagnated(d,20),false);
  d[blocker]=blocker==='heldBy'?null:false;
  assert.equal(openingHasStagnated(d,21),false);
 }
 d.openFraction=.9;assert.equal(openingHasStagnated(d,30),false);
});
test('D3.13A: no no-progress expiry when the hinge is only unobserved',()=>{
 const d=door();
 openingHasStagnated(d,0);
 assert.equal(openingHasStagnated(d,20),false);
 assert.equal(openingHasStagnated(d,20.5),false);
 for(let t=20.6;t<23.2;t+=.1)openingHasStagnated(d,t);
 assert.equal(openingHasStagnated(d,23.2),true);
});
test('D3.13A: ownership and collision contracts remain unchanged',()=>{
 const motor=readFileSync(new URL('../src/breach-motor-door.ts',import.meta.url),'utf8');
 const main=readFileSync(new URL('../src/breach-actor-motor.ts',import.meta.url),'utf8');
 assert.match(motor,/const stagnant=openingHasStagnated\(doorAhead,s\.seconds\)/);
 assert.match(motor,/if\(follower\)\{\s*if\(stagnant\)\{/);
 assert.match(motor,/return \{paused:false,closed:false,clearingDoorId:doorAhead\.id\}/);
 assert.match(motor,/if\(!openingAllowed\|\|!mayManipulateOpening\(s,a,doorAhead\)\)/);
 assert.match(main,/resolveMotorCollision\(a,p,next,passage\.move,dt,s,/);
});
