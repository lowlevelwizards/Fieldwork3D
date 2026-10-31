import test from 'node:test';
import assert from 'node:assert/strict';
import {compileArchitecturalSite} from '../src/worldgen/architectural-compiler.ts';
import {doorLeafSegment,doorBlocksSegment} from '../src/breach-core.ts';
import {initDoor,advanceDoor,kickDoor,doorClear} from '../src/breach-door.ts';
test('industrial shutters block their opening until actually raised',()=>{
 let found=0;
 for(const kind of ['garage','warehouse','utility'])for(let seed=0;seed<20;seed++){
  const site=compileArchitecturalSite(kind,seed,'standard');
  const candidate=site.doors.find(d=>d.kind==='shutter');
  if(!candidate)continue;
  found++;
  const door=initDoor(candidate,0);
  const m={x:(door.a.x+door.b.x)/2,y:(door.a.y+door.b.y)/2};
  const horizontal=Math.abs(door.a.y-door.b.y)<1;
  const crossing=horizontal?{a:{x:m.x,y:m.y-18},b:{x:m.x,y:m.y+18}}:
    {a:{x:m.x-18,y:m.y},b:{x:m.x+18,y:m.y}};
  assert.ok(doorBlocksSegment(door,crossing));
  assert.equal(kickDoor(door,m).opened,false);
  assert.equal(door.open,false);
  door.open=true;
  for(let i=0;i<100;i++)advanceDoor(door,1/60);
  assert.ok(doorClear(door));
  assert.equal(doorBlocksSegment(door,crossing),false);
  assert.ok(doorLeafSegment(door).a.x===doorLeafSegment(door).b.x);
 }
 assert.ok(found>=6,'industrial facility must have meaningful shutters');
});
