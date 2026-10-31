import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {generateSite} from '../src/breach-site.ts';
import {activateSite,passable,route} from '../src/breach-core.ts';
test('courtyard hotel and shop setbacks have real operable entrances',()=>{
 let observed=0;
 for(const kind of ['motel','house','retail','warehouse','clinic']){
  for(let seed=0;seed<22;seed++){
   const site=compileArchitecturalSite(kind,seed,seed%2?'standard':'expanded');
   for(const door of site.doors.filter(d=>d.id.startsWith('COURT-'))){
    observed++;
    assert.ok(Math.abs(Math.hypot(door.a.x-door.b.x,door.a.y-door.b.y)-48)<.001);
    const mid={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
    activateSite(site);
    try{assert.ok(passable(mid),'blocked court threshold '+kind+' '+seed);}
    finally{activateSite(null);}
   }
  }
 }
 assert.ok(observed>=8,'courtyard openings are absent');
});
test('courtyard openings preserve a critical mission route on both scales',()=>{
 for(let seed=1;seed<=36;seed++)for(const scale of ['standard','expanded']){
  const s=generateSite(seed,scale);
  activateSite(s);
  try{assert.ok(route(s.spawn[0],s.objective).length,'unreachable '+seed);}
  finally{activateSite(null);}
 }
});
