import test from 'node:test';
import assert from 'node:assert/strict';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {advanceDoor,initDoor,pushDoor} from '../src/breach-door.ts';

const from={x:120,y:200},to={x:260,y:200};
const door=(style)=>initDoor({id:'TEST-DOOR',a:{x:200,y:175},b:{x:200,y:225},
 open:false,openFraction:0,openedAt:-1,kind:'hinged',style},0);

test('glass remains solid to weapon geometry but transparent to projectile lane',()=>{
 const glass=door('glazed');
 assert.equal(assessFireLane(from,26,to,26,[],[],[glass]).blocker,'clear');
 assert.equal(assessFireLane(from,26,to,26,[],[],[glass],[],'weapon').blocker,'door');
 assert.equal(assessFireLane(from,26,to,26,[],[],[door('wood')]).blocker,'door');
 assert.equal(assessFireLane(from,26,to,26,[],[],[door('french')]).blocker,'clear');
});
test('window glazing is bullet passable, but still physically solid to muzzle',()=>{
 const glass={x:200,y:200,w:10,h:55,fixture:'glass-barrier'};
 assert.equal(assessFireLane(from,26,to,26,[glass],[],[]).blocker,'clear');
 assert.equal(assessFireLane(from,26,to,26,[glass],[],[],[],'weapon').blocker,'cover');
});
test('serving hatch permits upper-body fire, not low fire through solid sill',()=>{
 const sill={x:200,y:200,w:10,h:55,fixture:'window-sill',low:true};
 assert.equal(assessFireLane(from,26,to,26,[sill],[],[]).blocker,'clear');
 assert.equal(assessFireLane(from,11,to,11,[sill],[],[]).blocker,'cover');
});
test('sustained pressure can push an open hinged leaf beyond normal 90 degree stop',()=>{
 const d=door('wood');d.open=true;d.openFraction=.99;
 for(let i=0;i<30;i++)pushDoor(d,2);
 assert.ok(d.pushTarget>1.14);
 for(let i=0;i<120;i++)advanceDoor(d,1/60);
 assert.ok(d.openFraction>1.06,'contacted leaf should continue past its resting angle');
 d.open=false;
 for(let i=0;i<120;i++)advanceDoor(d,1/60);
 assert.equal(d.pushTarget,1,'closing resets push extension');
});
