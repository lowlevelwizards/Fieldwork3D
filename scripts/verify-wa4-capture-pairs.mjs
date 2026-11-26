import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
const [before,after]=process.argv.slice(2);
const load=root=>JSON.parse(readFileSync(join(root,'manifest.json')));
const a=load(before),b=load(after),records=x=>x.reports.flatMap(r=>r.records);
const map=new Map(records(a).map(r=>[r.id,r]));
let panels=0,silhouettes=0;
assert.equal(records(a).length,records(b).length);
for(const r of records(b)){
 const p=map.get(r.id);assert.ok(p,r.id);assert.equal(p.panels.length,r.panels.length);
 for(const panel of r.panels){
  const prior=p.panels.find(x=>x.name===panel.name);assert.ok(prior,r.id+' '+panel.name);
  for(const key of ['width','height','horizontalSpan','calls','triangles'])assert.equal(panel.metrics[key],prior.metrics[key],r.id+' '+panel.name+' '+key);
  if(panel.name==='silhouette-fit'){
   const file=join(r.platform,r.id,panel.name+'.png');
   assert.deepEqual(readFileSync(join(after,file)),readFileSync(join(before,file)),r.id+' exact silhouette pixels');silhouettes++;
  }
  panels++;
 }
}
console.log('WA4 paired evidence: '+panels+' matched render panels; '+silhouettes+' identical silhouette PNGs');
