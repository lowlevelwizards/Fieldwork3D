/** A3.5: physical contact contract and conflict/replay gates. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
 validContactAnchor,contactWithinReach,contactAllowedByOwners,
 selectPhysicalContact,releasePhysicalContact,
 physicalContactWeight,resolvePhysicalContactPose,
 doorGripPhysicalContact
} from '../src/breach-physical-contact-anchor.ts';
import {doorGripWeight} from '../src/breach-pose-door-hand.ts';
const owners=(action='hold',left='weapon',right='weapon')=>
 ({action,left,right,phase:null});
const anchor=(target='surface',id='wall-1',x=20)=>
 ({target,id,point:{x,y:19,z:0},normal:{x:-1,y:0,z:0}});
const contact=(intent='brace',target='surface',id='wall-1',x=20)=>
 ({intent,limb:'support-hand',anchor:anchor(target,id,x),
   startedAt:2,releasedAt:null});
const reach=(from=0)=>({from:{x:from,y:19,z:0},
 acquireReach:25,retainReach:30,lineClear:true});
test('A3.5 anchors require real finite points, unit normals and identity',()=>{
 const a=anchor();assert.equal(validContactAnchor(a),true);
 assert.equal(validContactAnchor({...a,id:''}),false);
 assert.equal(validContactAnchor({...a,normal:{x:0,y:0,z:0}}),false);
 assert.equal(validContactAnchor({...a,point:{x:NaN,y:19,z:0}}),false);
});
test('A3.5 reach requires clear world ray and uses retention hysteresis',()=>{
 const c=contact('brace','surface','near',28);
 assert.equal(contactWithinReach(c,reach()),false);
 assert.equal(contactWithinReach(c,reach(),true),true);
 assert.equal(contactWithinReach(c,{...reach(),lineClear:false},true),false);
 assert.equal(contactWithinReach(c,{...reach(),retainReach:10},true),false);
});
test('A3.5 action priority never steals the firing or busy support hand',()=>{
 const c=contact(),r=reach();
 assert.equal(contactAllowedByOwners(c,owners()),true);
 for(const action of ['down','surrender','treatment','reload','throw',
   'push','injury','door']){
  assert.equal(selectPhysicalContact([{contact:c,reach:r}],
    owners(action,'medical'),3),null,action);
 }
 assert.equal(contactAllowedByOwners({...c,limb:'firing-hand'},
   owners()),false);
 assert.equal(contactAllowedByOwners({...c,limb:'firing-hand'},
   owners('hold','weapon','free')),true);
});
test('A3.5 deterministic priority, stable tie-break and retained contact',()=>{
 const first=contact('brace','surface','B');
 const second=contact('brace','surface','A');
 const teammate=contact('teammate','teammate','ally');
 const claims=[first,teammate,second].map(contact=>({contact,reach:reach()}));
 assert.equal(selectPhysicalContact(claims,owners(),3)?.anchor.id,'A');
 assert.equal(selectPhysicalContact(claims,owners(),3,first)?.anchor.id,'B');
 assert.equal(selectPhysicalContact([...claims].reverse(),owners(),3)?.anchor.id,'A');
 const tooFar=contact('brace','surface','B',28);
 assert.equal(selectPhysicalContact([{contact:tooFar,reach:reach()}],
   owners(),3),null);
 assert.equal(selectPhysicalContact([{contact:tooFar,reach:reach()}],
   owners(),3,tooFar)?.anchor.id,'B');
});
test('A3.5 release is immutable and replay-time pure',()=>{
 const c=contact();const released=releasePhysicalContact(c,2.4);
 assert.equal(c.releasedAt,null);assert.equal(released.releasedAt,2.4);
 assert.strictEqual(releasePhysicalContact(released,2.5),released);
 const a=physicalContactWeight(released,2.5);
 assert.ok(a>0&&a<1);
 assert.equal(a,physicalContactWeight(released,2.5));
 assert.equal(resolvePhysicalContactPose({...released,releasedAt:3},
   owners(),2.5)?.retained,true,'seek before release preserves attachment');
 assert.equal(physicalContactWeight(released,2.8),0);
 assert.equal(physicalContactWeight(c,1.5),0);
 assert.equal(resolvePhysicalContactPose(released,
   owners('reload','magazine'),2.5),null);
 assert.ok(resolvePhysicalContactPose(released,owners(),2.5));
});
test('A3.5 D4 moving panel normal, support owner and release match D4',()=>{
 const grip={point:{x:10,y:20},mode:'panel',startedAt:2,
   releasedAt:null};
 const leaf={a:{x:0,y:20},b:{x:20,y:20}};
 const c=doorGripPhysicalContact('doorA',grip,leaf,{x:10,y:15});
 assert.ok(c);assert.equal(c.anchor.target,'door');
 assert.deepEqual(c.anchor.point,{x:10,y:19,z:20});
 assert.deepEqual(c.anchor.normal,{x:0,y:0,z:-1});
 assert.ok(Math.abs(physicalContactWeight(c,2.1)-
   doorGripWeight(grip,2.1))<1e-9);
 assert.ok(resolvePhysicalContactPose(c,
  owners('door','door'),2.1));
 assert.equal(resolvePhysicalContactPose(c,owners(),2.1),null);
 const gone=releasePhysicalContact(c,2.3);
 assert.equal(physicalContactWeight(gone,2.54),0);
 assert.equal(doorGripPhysicalContact('doorA',grip,
   {a:{x:0,y:0},b:{x:0,y:0}},{x:1,y:1}),null);
});
