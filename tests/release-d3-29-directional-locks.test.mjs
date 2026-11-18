import test from 'node:test';
import assert from 'node:assert/strict';
import {doorFrameSide,doorSecuredFrom,releasePrivacyLockOnOpen}
 from '../src/breach-door-security.ts';
import {doorInteraction} from '../src/breach-interactions.ts';
import {entryToolVerdict} from '../src/breach-entry-tools.ts';
import {implicitOpenDenial} from '../src/breach-motor-door.ts';
import {initDoor} from '../src/breach-door.ts';

const positive={x:33,y:18};
const negative={x:33,y:-18};
const door=(kind='security',face='positive')=>initDoor({
 id:'ACCESS',a:{x:0,y:0},b:{x:40,y:0},
 open:false,openedAt:-1,locked:true,
 lockSide:face,securityKind:kind,hinge:'a',swing:1
},0);
const open=(d,p)=>doorInteraction({
 target:d,action:'open',actorId:'ash',actorPosition:p
});

test('D3.29G: fixed frame-relative lock face ignores hinge and swing',()=>{
 for(const hinge of ['a','b'])for(const swing of [-1,1]){
  const d=door();d.hinge=hinge;d.swing=swing;
  assert.equal(doorFrameSide(d,positive),'positive');
  assert.equal(doorFrameSide(d,negative),'negative');
  assert.equal(doorSecuredFrom(d,positive),true);
  assert.equal(doorSecuredFrom(d,negative),false);
  assert.equal(open(d,positive).reason,'locked');
  assert.equal(open(d,negative).allowed,true);
 }
});
test('D3.29G: opposite face can instead be the secured face',()=>{
 const d=door('security','negative');
 assert.equal(open(d,positive).allowed,true);
 assert.equal(open(d,negative).reason,'locked');
});
test('D3.29G: missing lock metadata preserves strict legacy two-sided locks',()=>{
 const d=door();delete d.lockSide;delete d.securityKind;
 assert.equal(open(d,positive).reason,'locked');
 assert.equal(open(d,negative).reason,'locked');
 assert.equal(doorSecuredFrom(d,{x:20,y:0}),true);
});
test('D3.29G: privacy free-egress OPEN removes latch; security egress retains it',()=>{
 const privacy=door('privacy');
 assert.equal(releasePrivacyLockOnOpen(privacy,positive),false);
 assert.equal(privacy.locked,true);
 assert.equal(releasePrivacyLockOnOpen(privacy,negative),true);
 assert.equal(privacy.locked,false);
 assert.equal(open(privacy,positive).allowed,true);
 const security=door('security');
 assert.equal(releasePrivacyLockOnOpen(security,negative),false);
 assert.equal(security.locked,true);
 assert.equal(open(security,positive).reason,'locked');
 assert.equal(open(security,negative).allowed,true);
});
test('D3.29G: lockpick only works on a secured face; requires physical mechanism',()=>{
 const d=door();
 assert.equal(entryToolVerdict(d,'pick',positive).allowed,true);
 assert.equal(entryToolVerdict(d,'pick',negative).allowed,false);
 assert.equal(entryToolVerdict(d,'pick',negative).reason,'NOT LOCKED FROM THIS SIDE');
 const both=door('restricted','both');
 assert.equal(entryToolVerdict(both,'pick',positive).allowed,true);
 assert.equal(entryToolVerdict(both,'pick',negative).allowed,true);
 both.kind='shutter';
 assert.equal(entryToolVerdict(both,'pick',negative).allowed,false);
});
test('D3.29G: implicit motor cannot override an out-of-reach locked secured face',()=>{
 const d=door();
 const outOfReach={allowed:false,reason:'out-of-reach'};
 assert.equal(implicitOpenDenial(d,outOfReach,'ash',positive),'locked');
 assert.equal(implicitOpenDenial(d,outOfReach,'ash',negative),null);
 const legacy=door('restricted','both');
 assert.equal(implicitOpenDenial(legacy,outOfReach,'ash',negative),'locked');
});
