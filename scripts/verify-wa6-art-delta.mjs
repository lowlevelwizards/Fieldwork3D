import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const a=JSON.parse(readFileSync(process.argv[2])),b=JSON.parse(readFileSync(process.argv[3]));
assert.equal(a.records.length,b.records.length);
assert.equal(new Set(b.records.map(r=>r.id)).size,b.records.length);
const before=new Map(a.records.map(r=>[r.id,r])),changed=[],unchanged=[];
let saved=0,reliefCases=0;
for(const r of b.records){
 const prior=before.get(r.id);assert.ok(prior,r.id);
 assert.equal(r.platform,prior.platform,r.id);
 if(r.platform!=='ar15'){
  assert.equal(r.artHash,prior.artHash,r.id+' unrelated artwork');unchanged.push(r.id);continue;
 }
 assert.notEqual(r.artHash,prior.artHash,r.id+' calibrated artwork');
 assert.ok(r.triangles<=prior.triangles,r.id+' emitted triangle budget');
 assert.ok(r.meshes<=prior.meshes,r.id+' mesh budget');
 if(prior.reliefTriangles>0){
  assert.equal(r.reliefTriangles,prior.reliefTriangles/2,r.id+' decorative relief reduction');
  reliefCases++;
 }
 saved+=prior.triangles-r.triangles;
 changed.push({id:r.id,before:prior.triangles,after:r.triangles,meshesBefore:prior.meshes,meshesAfter:r.meshes});
}
assert.ok(changed.length>=9&&reliefCases>=3&&saved>0);
const report={changed,unchanged,reliefCases,emittedTrianglesSaved:saved};
writeFileSync(process.argv[4],JSON.stringify(report,null,2)+'\n');
console.log('WA6 delta verified: '+changed.length+' AR cases; '+unchanged.length+' unrelated cases exact; '+reliefCases+' decorative relief cases; '+saved+' aggregate emitted triangles removed');
