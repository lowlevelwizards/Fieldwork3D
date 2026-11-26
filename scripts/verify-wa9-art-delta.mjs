import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const before=JSON.parse(readFileSync(process.argv[2])),after=JSON.parse(readFileSync(process.argv[3]));
// R1 independently verified that only the retired placeholder was removed.
// Compare the full retained catalog against the historical WA8 checkpoint.
const retained=before.records.filter(r=>r.platform!=='legacy');
assert.equal(before.records.length-retained.length,1);
const map=new Map(retained.map(r=>[r.id,r]));
const permitted=new Map([[0x3e4441,0x474e50],[0x313735,0x303831],[0x2f3434,0x414749]]);
assert.equal(retained.length,after.records.length);
assert.equal(new Set(after.records.map(r=>r.id)).size,after.records.length);
const changed=[],unchanged=[];
for(const r of after.records){
 const p=map.get(r.id);assert.ok(p,r.id);
 assert.equal(r.platform,p.platform,r.id);
 assert.equal(r.colorIndependentHash,p.colorIndependentHash,r.id+' all non-color artwork data');
 if(r.platform!=='mp5'){
  assert.equal(r.artHash,p.artHash,r.id+' unrelated artwork');
  unchanged.push(r.id);continue;
 }
 assert.notEqual(r.artHash,p.artHash,r.id+' calibration is visible in material inputs');
 assert.equal(r.colors.length,p.colors.length,r.id);
 for(let i=0;i<r.colors.length;i++)if(r.colors[i]!==p.colors[i])assert.equal(r.colors[i],permitted.get(p.colors[i]),r.id+' only reviewed color transitions');
 changed.push(r.id);
}
assert.ok(changed.length>=6);assert.ok(unchanged.length>0);
const result={changed,unchanged,nonColorParity:after.records.length};
if(process.argv[4])writeFileSync(process.argv[4],JSON.stringify(result,null,2)+'\n');
console.log('WA9 delta verified: '+changed.length+' calibrated cases; '+unchanged.length+' unrelated cases exact; all '+after.records.length+' non-color inputs exact');
