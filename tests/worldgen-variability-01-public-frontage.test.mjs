import test from 'node:test';
import assert from 'node:assert/strict';
import {architecturalBlueprint,ARCHITECTURAL_FAMILIES}
 from '../src/worldgen/architectural-program.ts';
import {choosePublicFrontage} from '../src/worldgen/public-frontage.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {generateSite} from '../src/breach-site.ts';

test('public entries move across real exterior bays rather than one hard-coded corner',()=>{
 for(const kind of ['house','retail','restaurant','office','clinic']){
  const plan=architecturalBlueprint(kind,4),choices=new Set();
  for(let seed=0;seed<50;seed++){
   const front=choosePublicFrontage(plan,seed);
   assert.ok(front.col>=0&&front.col<plan.widths.length);
   assert.ok(front.fraction>.20&&front.fraction<.80);
   choices.add(front.col+':'+front.fraction);
  }
  assert.ok(choices.size>=3,kind+' front door stayed in one place');
 }
});
test('compiled physical entrances stay on the real exposed wall for all building types',()=>{
 for(const kind of ARCHITECTURAL_FAMILIES)for(const seed of [0,1,4,7,12,19]){
  const site=compileArchitecturalSite(kind,seed,'medium',
   kind==='retail'?'convenience-store':'');
  const front=site.doors.find(d=>d.id==='FRONT');
  assert.ok(front,kind+' '+seed);
  assert.ok(Math.abs(front.a.y-front.b.y)<.01,kind+' '+seed);
  const cx=(front.a.x+front.b.x)/2,cy=(front.a.y+front.b.y)/2;
  const inside=site.rooms.some(r=>cx>r.x&&cx<r.x+r.w&&
    Math.abs(r.y+r.h-cy)<.01&&
    !['bedroom','bathroom','guest','restroom','exam','treatment'].includes(r.purpose));
  assert.ok(inside,kind+' '+seed+' entrance does not face public room');
 }
});
test('convenience stores open sales to checkout instead of a compulsory room door',()=>{
 const site=compileArchitecturalSite('retail',4,'medium','convenience-store');
 const sales=site.rooms.filter(r=>r.purpose==='sales'),checkout=site.rooms.filter(r=>r.purpose==='checkout');
 const adjacent=sales.some(a=>checkout.some(b=>
  (Math.abs(a.x+a.w-b.x)<.01||Math.abs(b.x+b.w-a.x)<.01)&&
   Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y)>45||
  (Math.abs(a.y+a.h-b.y)<.01||Math.abs(b.y+b.h-a.y)<.01)&&
   Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x)>45));
 assert.ok(adjacent,'fixture workflow should meet sales floor');
});
test('live site generation stays deterministic with variable entry points',()=>{
 const a=generateSite(22,'medium'),b=generateSite(22,'medium');
 assert.deepEqual(a.doors,b.doors);
 assert.deepEqual(a.spawn,b.spawn);
 assert.deepEqual(a.entrance,b.entrance);
});
