import test from 'node:test';
import assert from 'node:assert/strict';
import {contactReaction} from '../src/breach-contact-reactions.ts';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
import {LabMotionCache} from '../src/breach-lab-tracks.ts';
import {readFileSync} from 'node:fs';
const pose=(age,role)=>({
 x:0,z:0,seconds:2,heading:0,velocity:0,stride:0,
 posture:'stand',injury:0,weapon:'carbine',reload:0,reloadDuration:1.8,
 lastThrowAt:-100,lastDoorAt:-100,down:false,surrender:false,
 aiming:false,firing:false,turning:0,
 lastBashAt:age, bashRole:role,deterministic:true
});
test('154: push and received contact have distinct bounded reactions',()=>{
 const p=contactReaction(.2,'push',false);
 const r=contactReaction(.2,'receive',true);
 assert.ok(p.active&&r.active);
 assert.ok(p.lean<0&&r.lean>0);
 assert.ok(p.reach>0&&r.reach===0);
 assert.ok(r.brace>0);
 assert.deepEqual(contactReaction(1,'push'),{
   active:false,weight:0,lean:0,reach:0,head:0,brace:0
 });
});
test('154: physical shove does not stretch or destabilize operator limbs',()=>{
 const r=createOperatorRig('rook','blue');
 poseOperator(r,pose(-100,null),0);
 const idle=r.chest.rotation.z;
 poseOperator(r,pose(1.8,'push'),0);
 assert.ok(r.chest.rotation.z<idle-.03);
 for(const foot of r.feet){
   assert.ok(foot.upper.scale.y<=9.70001);
   assert.ok(foot.lower.scale.y<=9.70001);
   assert.ok(foot.shoe.position.toArray().every(Number.isFinite));
 }
 assert.ok(r.arms.every(a=>a.hand.position.toArray().every(Number.isFinite)));
 r.dispose();
});
test('154: new shove lab track preserves deterministic foot contacts',()=>{
 const lab=new LabMotionCache('bash');
 const reference=lab.sample(1.005);
 for(const t of [0,.5,3,1.005])lab.sample(t);
 assert.deepEqual(lab.sample(1.005).feet,reference.feet);
 const page=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 assert.match(page,/data-pose="bash"/);
});