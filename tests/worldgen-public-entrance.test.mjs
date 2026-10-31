import test from 'node:test';
import assert from 'node:assert/strict';
import {correctPublicEntrance,entrancePurpose}
  from '../src/worldgen/public-entrance.ts';
import {generateSite} from '../src/breach-site.ts';
import {auditGeneratedSite} from '../src/breach-site-audit.ts';
test('front-door correction swaps roles without changing building departments',()=>{
 const site={doors:[{id:'FRONT',a:{x:40,y:100},b:{x:88,y:100}}],
  rooms:[{id:'R1',x:0,y:0,w:150,h:100,kind:'room'},
   {id:'R2',x:150,y:0,w:100,h:100,kind:'room'}]};
 const assignments=new Map([['R1','exam'],['R2','waiting']]);
 const fixed=correctPublicEntrance(site,'clinic',assignments);
 assert.equal(entrancePurpose(site,fixed),'waiting');
 assert.equal(fixed.get('R2'),'exam');
 assert.deepEqual([...fixed.values()].sort(),[...assignments.values()].sort());
});
test('default-seed public entrance improvements preserve reachability',()=>{
 let clinic=0;
 for(let seed=1;seed<=92;seed++){
  const site=generateSite(seed);
  if(site.archetype==='clinic'){
   clinic++;
   const front=site.doors.find(d=>d.id==='FRONT');
   const p=front&&{x:(front.a.x+front.b.x)/2,
    y:(front.a.y+front.b.y)/2-19};
   const role=p&&site.rooms.find(r=>p.x>r.x&&p.x<r.x+r.w&&
     p.y>r.y&&p.y<r.y+r.h);
   assert.notEqual(role?.purpose,'exam','clinic seed '+seed);
  }
  assert.deepEqual(auditGeneratedSite(seed).errors,[],'seed '+seed);
 }
 assert.ok(clinic>=5);
});
