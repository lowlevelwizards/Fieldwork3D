import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const a=JSON.parse(readFileSync(process.argv[2])).records,b=JSON.parse(readFileSync(process.argv[3])).records;
const map=new Map(a.map(r=>[r.id,r]));
assert.equal(b.length,a.length-1);
assert.equal(new Set(b.map(r=>r.id)).size,b.length);
for(const r of b){const p=map.get(r.id);assert.ok(p,r.id);assert.equal(r.artHash,p.artHash,r.id+' retained artwork');map.delete(r.id);}
assert.equal(map.size,1);
assert.equal([...map.values()][0].platform,'legacy','only obsolete artwork removed');
console.log('Catalog retirement: '+b.length+' retained artwork cases exact; one obsolete reference removed');
