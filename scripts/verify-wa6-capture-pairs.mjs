import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [before,after]=process.argv.slice(2);
const records=root=>JSON.parse(readFileSync(join(root,'manifest.json'))).reports.flatMap(r=>r.records);
const a=records(before),b=records(after),map=new Map(a.map(r=>[r.id,r]));
assert.equal(a.length,b.length);
const pairs=[];
for(const r of b){
 const prior=map.get(r.id);assert.ok(prior,r.id);assert.equal(r.panels.length,prior.panels.length);
 for(const p of r.panels){
  const q=prior.panels.find(x=>x.name===p.name);assert.ok(q,r.id+' '+p.name);
  assert.equal(p.metrics.width,q.metrics.width);assert.equal(p.metrics.height,q.metrics.height);
  const spanDelta=Math.abs(p.metrics.horizontalSpan-q.metrics.horizontalSpan)/q.metrics.horizontalSpan;
  assert.ok(spanDelta<.05,r.id+' '+p.name+' framing changed by more than 5%');
  assert.ok(p.metrics.calls<=q.metrics.calls,r.id+' '+p.name+' draw count');
  assert.ok(p.metrics.triangles<=q.metrics.triangles,r.id+' '+p.name+' rendered triangles');
  const path=join(r.platform,r.id,p.name+'.png');
  const identical=readFileSync(join(before,path)).equals(readFileSync(join(after,path)));
  if(r.platform!=='ar15'&&!r.platform.startsWith('custom-ar15')&&!r.id.startsWith('ar-'))assert.ok(identical,r.id+' unrelated panel');
  pairs.push({id:r.id,view:p.name,identical,spanDelta,beforeTriangles:q.metrics.triangles,afterTriangles:p.metrics.triangles});
 }
}
writeFileSync(join(after,'paired-review.json'),JSON.stringify(pairs,null,2)+'\n');
console.log('WA6 paired evidence: '+pairs.length+' matched views; '+pairs.filter(p=>p.identical).length+' pixel-identical panels. Visual signoff remains separate.');
