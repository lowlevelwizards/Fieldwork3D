/** VEH changes outdoor geometry, not mission authoring. Compare the same
 * corpus on the immutable historical anchor, exact PR base and candidate.
 * Historical drift is reported, never silently rebaselined. All semantic
 * fields (including errors) must match the exact base, and no additional
 * blocked routes are allowed per scenario. The independent C0 physical
 * quality gate remains mandatory; only its numeric quality score may vary.
 */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const [historicPath,basePath,headPath,dest]=process.argv.slice(2);
const load=p=>JSON.parse(readFileSync(p,'utf8'));
const [historic,base,head]=[historicPath,basePath,headPath].map(load);
const semantic=({quality,blockedRoutes,...row})=>row;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
for(const data of [historic,base,head]){
 assert.equal(data.rows.length,15);
 assert.equal(data.summary.invalid,0);
 assert.equal(data.summary.semanticInvalid,0);
 assert.equal(new Set(data.rows.map(r=>r.seed+':'+r.mission)).size,15);
}
const historicalDifferences=[],newDifferences=[],physical=[];
for(let i=0;i<15;i++){
 const a=historic.rows[i],b=base.rows[i],c=head.rows[i];
 assert.equal(a.seed,b.seed);assert.equal(b.seed,c.seed);
 assert.equal(a.mission,b.mission);assert.equal(b.mission,c.mission);
 const key={seed:b.seed,mission:b.mission};
 if(!same(semantic(a),semantic(b)))historicalDifferences.push({...key,fields:Object.keys(semantic(b)).filter(k=>!same(a[k],b[k]))});
 if(!same(semantic(b),semantic(c)))newDifferences.push({...key,fields:[...new Set([...Object.keys(semantic(b)),...Object.keys(semantic(c))])].filter(k=>!same(b[k],c[k]))});
 physical.push({...key,baseQuality:b.quality,headQuality:c.quality,baseBlocked:b.blockedRoutes,headBlocked:c.blockedRoutes});
}
const addedRouteBlocks=physical.filter(r=>r.headBlocked>r.baseBlocked);
const report={historicalDifferences,newDifferences,addedRouteBlocks,physical};
console.log('VEH exact base mission parity '+JSON.stringify(report));
if(dest)writeFileSync(dest,JSON.stringify(report,null,2)+'\n');
assert.equal(newDifferences.length,0,'vehicle generation must preserve all mission semantics of the exact production base');
assert.equal(addedRouteBlocks.length,0,'vehicle generation must not introduce blocked routes');
