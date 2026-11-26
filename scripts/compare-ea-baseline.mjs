/** Read-only paired comparison of EA fixed-step benchmark output.
 * A change in decision fingerprints is expected from behavior changes.
 * Host timings are descriptive, not device FPS or a hardware claim. */
import {readFileSync,writeFileSync} from 'node:fs';
const [beforePath,afterPath,output]=process.argv.slice(2);
const before=JSON.parse(readFileSync(beforePath,'utf8')),after=JSON.parse(readFileSync(afterPath,'utf8'));
const records=x=>x.records??[];
const key=r=>[r.seed,r.mission,r.entry].join('/');
const med=values=>{const s=values.filter(Number.isFinite).sort((a,b)=>a-b);return s.length?s[Math.floor((s.length-1)*.5)]:null;};
const rows=records(after).map(a=>{
 const b=records(before).find(x=>key(x)===key(a));
 if(!b)throw Error('Unpaired scenario '+key(a));
 return {case:key(a),changed:a.fingerprint!==b.fingerprint,base:b.tickMs,candidate:a.tickMs,
  baseContact:b.firstContact?.at??null,candidateContact:a.firstContact?.at??null,
  baseShots:b.actualShots,candidateShots:a.actualShots};
});
if(rows.length!==records(before).length||!rows.length)throw Error('Incomplete EA comparison');
const q=(side,name)=>med(rows.map(r=>r[side]?.[name]));
const report={schema:'EA/pair-comparison-v1',base:before.base,candidate:after.base,pairs:rows.length,
 changedFingerprints:rows.filter(x=>x.changed).length,
 medians:Object.fromEntries(['p50','p95','p99','max'].map(name=>[name,{base:q('base',name),candidate:q('candidate',name)}])),
 before:before.summary,after:after.summary,rows};
console.log('EA paired tick comparison',JSON.stringify({...report,rows:undefined}));
if(output)writeFileSync(output,JSON.stringify(report,null,2)+'\n');
