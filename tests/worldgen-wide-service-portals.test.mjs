import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {activateSite,passable,doorBlocksSegment,doorCenter} from '../src/breach-core.ts';
test('wide exterior access is physical whether open, double-leaf or shuttered',()=>{
 let found=0,open=0,closable=0;
 for(const kind of ['garage','warehouse','retail','restaurant','utility']){
  for(let seed=0;seed<22;seed++){
   const site=compileArchitecturalSite(kind,seed);
   const portal=site.openings?.find(o=>o.id==='OPEN-SERVICE');
   const shutter=site.doors.find(d=>d.kind==='shutter');
   const pair=site.doors.find(d=>d.id==='DOUBLE-L');
   if(!portal&&!shutter&&!pair)continue;
   found++;
   if(portal){
    open++;
    const width=Math.hypot(portal.a.x-portal.b.x,portal.a.y-portal.b.y);
    assert.ok(width>=95&&width<=113);
    const center={x:(portal.a.x+portal.b.x)/2,y:(portal.a.y+portal.b.y)/2};
    activateSite(site);
    try{assert.ok(passable(center),'open bay obstructed '+kind+' '+seed);}
    finally{activateSite(null);}
   }
   if(shutter||pair){
    closable++;
    const door=shutter??pair,p=doorCenter(door);
    const horizontal=Math.abs(door.a.y-door.b.y)<1;
    const segment=horizontal?{a:{x:p.x,y:p.y-20},b:{x:p.x,y:p.y+20}}:
      {a:{x:p.x-20,y:p.y},b:{x:p.x+20,y:p.y}};
    assert.ok(doorBlocksSegment(door,segment));
    if(pair)assert.ok(site.doors.find(d=>d.id==='DOUBLE-R'));
   }
  }
 }
 assert.ok(found>=25,'site generator must provide diverse wide approaches');
 assert.ok(open>=2,'some public entries remain open');
 assert.ok(closable>=6,'some wide entries must be controllable');
});
