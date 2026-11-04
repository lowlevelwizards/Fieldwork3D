import test from 'node:test';
import assert from 'node:assert/strict';
import {auditShots,summarizeShots} from '../src/breach-shot-audit.ts';
import {selectFireableContact} from '../src/breach-target-selection.ts';
import {acquisitionSeconds} from '../src/breach-firing-cadence.ts';
import {assessFireLane} from '../src/breach-fire-safety.ts';
import {shotYaw,rayHitsActor,dispersion,readyMode,handlingInstability}
 from '../src/breach-ballistics.ts';

test('B0 a shot audit reflects immutable muzzle, yaw, outcome and shot ID',()=>{
 const shots=[
  {id:12,firedAt:1.3,shooterId:'rook',targetId:'guard',
   start:{x:25,y:30},end:{x:125,y:30},muzzleHeight:26,
   shotYaw:0,hit:true,down:false,surface:'blood',mode:'point'},
  {id:13,firedAt:1.6,shooterId:'rook',targetId:'guard',
   start:{x:25,y:30},end:{x:80,y:60},muzzleHeight:26,
   shotYaw:.5,hit:false,down:false,surface:'stone',mode:'ads'}
 ];
 const immutable=JSON.stringify(shots);
 const rows=auditShots(shots);
 assert.equal(rows.length,2);
 assert.equal(rows[0].distance,100);
 assert.equal(rows[0].muzzleX,25);
 assert.equal(rows[1].surface,'stone');
 assert.equal(summarizeShots(rows).hitRate,.5);
 assert.equal(summarizeShots(rows).uniqueShots,2);
 assert.equal(JSON.stringify(shots),immutable);
});
test('B1 target selection prefers a legal lane, then stable current contact',()=>{
 const a={id:'a',p:{x:30,y:0}},b={id:'b',p:{x:60,y:0}},
  c={id:'c',p:{x:90,y:0}};
 const origin={x:0,y:0};
 const candidates=[a,b,c];
 assert.equal(selectFireableContact(origin,candidates,'a',t=>t.id!=='a')?.id,'b');
 assert.equal(selectFireableContact(origin,candidates,'c',t=>t.id!=='a')?.id,'c');
 assert.equal(selectFireableContact(origin,candidates,'a',()=>false)?.id,'a');
 assert.equal(selectFireableContact(origin,[],'a',()=>true),null);
 const blocker=assessFireLane(origin,26,{x:80,y:0},26,[],[],[],
  [{x:35,y:1}]);
 assert.equal(blocker.blocker,'friendly');
});
test('B2 movement, enemy readiness, attachments and caution affect acquisition timing',()=>{
 const base={base:.35,moving:false,skillFactor:1,enemy:false,
  attachmentFactor:1,cautious:false};
 const t=acquisitionSeconds(base);
 assert.ok(t>0);
 assert.ok(acquisitionSeconds({...base,moving:true})>t);
 assert.ok(acquisitionSeconds({...base,enemy:true})>t);
 assert.ok(acquisitionSeconds({...base,attachmentFactor:1.3})>t);
 assert.ok(acquisitionSeconds({...base,cautious:true})>t);
 assert.equal(acquisitionSeconds(base),t);
});
test('B2 final spread uses the barrel trajectory, not invisible hit rolls',()=>{
 const rested=dispersion('carbine','ads',1,false,0,0,0);
 const running=dispersion('carbine','ads',1,true,0,0,0);
 const shaken=dispersion('carbine','ads',.4,true,.7,1,.4);
 assert.ok(rested<running&&running<shaken);
 assert.ok(handlingInstability(.6,42,.2,.5)>
   handlingInstability(0,0,0,1));
 assert.equal(readyMode(40,.4,'carbine'),'point');
 assert.equal(readyMode(180,.4,'carbine'),null);
 const yaw=shotYaw(0,.2,.5,.5);
 assert.equal(yaw,0);
 assert.equal(rayHitsActor({x:0,y:0},yaw,{x:90,y:0},5),true);
 assert.equal(rayHitsActor({x:0,y:0},yaw,{x:90,y:14},5),false);
});
