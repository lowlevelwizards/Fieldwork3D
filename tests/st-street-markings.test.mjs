import test from 'node:test';import assert from 'node:assert/strict';
import {proposeStreetInfrastructure} from '../src/worldgen/street-infrastructure.ts';
import {planStreetMarkings} from '../src/worldgen/street-markings.ts';
test('lane markings follow visible nominal lanes, not center of cropped strips',()=>{
 for(const entrySide of ['north','south','east','west'])for(const kind of ['residential','commercial','industrial','rural'])for(const inset of [65,135,260]){
  const s={seed:19,entrySide,bounds:{minX:0,minY:0,maxX:720,maxY:720},rooms:[{x:inset,y:inset,w:720-2*inset,h:720-2*inset}],entrance:{x:360,y:360},doors:[],cover:[]};
  const p=proposeStreetInfrastructure(s,kind),site={...s,streetInfrastructure:p};
  const marks=planStreetMarkings(site),road=p.frontage.road;
  const lines=marks.filter(m=>m.kind==='road-centerline');
  assert.equal(lines.length>0,!!p.centerline);
  for(const m of marks){
   assert.ok(Math.abs(m.x-road.x)+m.width/2<=road.width/2+.001);
   assert.ok(Math.abs(m.y-road.y)+m.depth/2<=road.depth/2+.001);
   if(m.kind==='road-centerline')assert.equal(p.axis==='x'?m.y:m.x,p.axis==='x'?p.centerline.y:p.centerline.x);
  }
  if(kind==='industrial'&&p.centerline)assert.equal(lines.length,1);
  assert.deepEqual(planStreetMarkings(site),marks);
  assert.deepEqual(planStreetMarkings(s),[]);
 }
});
