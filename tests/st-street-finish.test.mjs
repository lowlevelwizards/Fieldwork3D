import test from 'node:test';import assert from 'node:assert/strict';
import {proposeStreetInfrastructure} from '../src/worldgen/street-infrastructure.ts';
import {planStreetFinishes} from '../src/worldgen/street-finish.ts';
import {isFlatExteriorFinish} from '../src/rendering/exterior-finish-packets.ts';
const contains=(a,b)=>Math.abs(a.x-b.x)+b.width/2<=a.width/2+.001&&Math.abs(a.y-b.y)+b.depth/2<=a.depth/2+.001;
test('public surface marks are deterministic, batched and on their actual substrate',()=>{
 for(const entrySide of ['north','south','east','west'])for(const kind of ['residential','commercial','industrial','rural']){
  const s={seed:8,entrySide,bounds:{minX:0,minY:0,maxX:600,maxY:600},rooms:[{x:245,y:245,w:110,h:110}],entrance:{x:300,y:300},doors:[],cover:[]};
  const p=proposeStreetInfrastructure(s,kind),site={...s,streetInfrastructure:p};
  const marks=planStreetFinishes(site);assert.deepEqual(marks,planStreetFinishes(site));
  assert.ok(marks.some(m=>m.kind==='road-patch'));
  assert.ok(marks.length<80);
  for(const m of marks){
   assert.ok(isFlatExteriorFinish(m.kind),m.kind);
   const substrates=m.kind==='street-verge'?[p.verge]:m.kind==='street-shoulder'?[p.shoulder]:m.kind==='sidewalk-joint'?p.frontage.sidewalkPieces:[p.frontage.road];
   assert.ok(substrates.some(r=>r&&contains(r,m)),m.kind+':'+entrySide);
  }
  assert.deepEqual(planStreetFinishes(s),[]);
 }
});
