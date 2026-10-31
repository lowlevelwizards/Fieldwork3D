import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('contiguous same-purpose cells form zones; separated service bays stay distinct',()=>{
 let bays=0,greens=0;
 for(let seed=0;seed<22;seed++){
  const site=compileArchitecturalSite('garage',seed);
  const groups=new Map();
  for(const room of site.rooms.filter(r=>r.purpose==='bay')){
   if(!groups.has(room.zoneId))groups.set(room.zoneId,[]);
   groups.get(room.zoneId).push(room);
  }
  bays+=groups.size;
  assert.ok(groups.size>=2,'the two service bays must be separate zones');
  greens+=site.rooms.filter(r=>r.zoneId?.startsWith('ZONE-')).length;
 }
 assert.ok(bays>=44&&greens>0);
});
test('furnishing large spaces varies compositions without duplicating appliances',()=>{
 let checked=0;
 for(let seed=1;seed<=45;seed++){
  const site=generateSite(seed,'expanded');
  if(!site.programLocked)continue;
  checked++;
  const groups=new Map();
  for(const room of site.rooms){
   const zone=room.zoneId??room.id;
   if(!groups.has(zone))groups.set(zone,[]);
   groups.get(zone).push(room);
  }
  for(const cells of groups.values()){
   if(cells.length<2)continue;
   const purpose=cells[0].purpose;
   if(!['living','kitchen','bay'].includes(purpose))continue;
   const fixture=purpose==='living'?'sofa':purpose==='kitchen'?'fridge':'vehicle-lift';
   const props=site.cover.filter(c=>c.fixture===fixture&&cells.some(r=>
     c.x>=r.x&&c.x<=r.x+r.w&&c.y>=r.y&&c.y<=r.y+r.h));
   assert.ok(props.length<=1,purpose+' duplicate signature furniture '+seed);
  }
  activateSite(site);
  try{
   assert.ok(passable(site.objective));
   assert.ok(route(site.spawn[0],site.objective).length);
  }finally{activateSite(null);}
 }
 assert.ok(checked>15);
});
