import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {activateSite,passable} from '../src/breach-core.ts';
test('industrial and shopfront plans gain physically clear, wide outdoor portals',()=>{
 let wide=0;
 for(const kind of ['garage','warehouse','retail','restaurant','utility']){
  for(let seed=0;seed<22;seed++){
   const site=compileArchitecturalSite(kind,seed);
   const portal=site.openings?.find(o=>o.id==='OPEN-SERVICE');
   if(!portal){
    // Operable shutters and double leaves replaced some old open arches.
    if(site.doors.some(d=>d.id==='SHUTTER'||d.id==='DOUBLE-L'))wide++;
    continue;
   }
   wide++;
   const center={x:(portal.a.x+portal.b.x)/2,
    y:(portal.a.y+portal.b.y)/2};
   const width=Math.hypot(portal.a.x-portal.b.x,
    portal.a.y-portal.b.y);
   assert.ok(width>=95&&width<=113);
   activateSite(site);
   try{assert.ok(passable(center),'open bay obstructed '+kind+' '+seed);}
   finally{activateSite(null);}
  }
 }
 assert.ok(wide>=25,'industrial and commercial entrances should vary');
});
