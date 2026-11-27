/** EB22: permit only the exact audited profile-issued ammunition/heading
 * changes in the historical generated rescue scenario. Everything else,
 * including civilian and replay state, must match the archived base. */
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const [a,b]=process.argv.slice(2).map(p=>JSON.parse(readFileSync(p,'utf8')));
assert.equal(a.fingerprint,'4493f9bf02ba61ed927422ee60ef48dbf402eeda0b4aaa813e609246a59c1d88');
assert.equal(b.fingerprint,'da37f5d9e892b59b7d636273459faf9c0f4fe7a824fe81545fefd30fc1924829');
assert.equal(a.checkpoints.length,7);assert.equal(b.checkpoints.length,7);
for(let i=0;i<7;i++){
 const x=structuredClone(a.checkpoints[i]),y=structuredClone(b.checkpoints[i]);
 const patch=(actor,key,previous,current)=>{
  assert.equal(x.actors[actor].id,y.actors[actor].id);
  assert.equal(x.actors[actor].side,y.actors[actor].side);
  assert.equal(x.actors[actor][key],previous);
  assert.equal(y.actors[actor][key],current);
  y.actors[actor][key]=previous;
 };
 patch(2,'magazine',30,20);patch(2,'reserve',90,60);
 patch(4,'magazine',30,6);patch(4,'reserve',90,24);
 if(i===1)patch(1,'heading',0.64313,-0.20422);
 if(i>=1)patch(2,'heading',-0.41469,1.06735);
 assert.deepEqual(y,x,'unexpected rescue checkpoint drift '+i);
}
console.log('EB22 historical rescue pair: exact approved deltas only; all seven checkpoints pass');
