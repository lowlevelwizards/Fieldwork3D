import test from 'node:test';
import assert from 'node:assert/strict';
import {apartmentUnitBlueprint} from '../src/worldgen/apartment-units.ts';
import {blueprintIssues} from '../src/worldgen/architectural-program.ts';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';

test('apartment unit programs distinguish one, two and four complete flats',()=>{
 for(const [scale,expected] of [['small',1],['medium',2],['large',4]]){
  const plan=apartmentUnitBlueprint(2,scale);
  assert.deepEqual(blueprintIssues(plan),[],scale);
  const owners=new Set(plan.unitIds.flat().filter(Boolean));
  assert.equal(owners.size,expected,scale);
  for(const owner of owners){
   const roles=plan.cells.flatMap((row,y)=>row.filter((role,x)=>
     plan.unitIds[y][x]===owner));
   // Each unit must physically have its own bedroom, bathroom, kitchen and living area.
   for(const role of ['living','bedroom','bathroom','kitchen'])
    assert.ok(plan.cells.some((row,y)=>row.some((r,x)=>r===role&&
      plan.unitIds[y][x]===owner)),owner+' missing '+role);
  }
 }
});
test('live apartment boundaries never create physical doors directly between separate flats',()=>{
 for(const seed of [2,13,24]){
  for(const scale of ['small','medium','large','standard']){
   const site=generateSite(seed,scale);
   assert.equal(site.archetype,'apartment');
   const expected=scale==='small'?1:scale==='large'?4:2;
   assert.equal(site.units?.length,expected,seed+' '+scale);
   for(const unit of site.units){
    const rooms=site.rooms.filter(r=>r.unitId===unit.id);
    for(const role of ['living','bedroom','bathroom','kitchen'])
     assert.ok(rooms.some(r=>r.purpose===role),unit.id+' '+role);
   }
   for(const d of site.doors){
    const x=(d.a.x+d.b.x)/2,y=(d.a.y+d.b.y)/2;
    const touching=site.rooms.filter(r=>x>=r.x-.1&&x<=r.x+r.w+.1&&
      y>=r.y-.1&&y<=r.y+r.h+.1);
    const distinct=new Set(touching.map(r=>r.unitId).filter(Boolean));
    assert.ok(distinct.size<=1,d.id+' crosses flat boundary');
   }
   activateSite(site);
   try{assert.ok(passable(site.objective));assert.ok(route(site.spawn[0],site.objective).length>0);}
   finally{activateSite(null);}
  }
 }
});
