import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const a=JSON.parse(readFileSync(process.argv[2])),b=JSON.parse(readFileSync(process.argv[3]));
const before=new Map(a.records.map(r=>[r.id,r]));
assert.equal(a.records.length,b.records.length);
const cases=[];let saved=0,submissions=0;
for(const r of b.records){
 const p=before.get(r.id);assert.ok(p,r.id);
 if(r.platform!=='ar15'){assert.equal(p.artHash,r.artHash,r.id+' scope');continue;}
 assert.equal(p.reliefTriangles,r.reliefTriangles,r.id+' WA6.1 retained');
 assert.ok(r.triangles<=p.triangles&&r.meshes<=p.meshes,r.id+' cost');
 const triangles=p.triangles-r.triangles,meshes=p.meshes-r.meshes;
 saved+=triangles;submissions+=meshes;
 cases.push({id:r.id,triangles,meshes});
}
assert.ok(cases.length>=9&&saved>0&&submissions>0);
writeFileSync(process.argv[4],JSON.stringify({cases,saved,submissions},null,2)+'\n');
console.log('WA6.2 incremental: '+saved+' triangles and '+submissions+' mesh objects removed across '+cases.length+' cases');
