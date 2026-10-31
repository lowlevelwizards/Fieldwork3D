import test from 'node:test';
import assert from 'node:assert/strict';
import {generateSite} from '../src/breach-site.ts';
import {circulationFor,circulationScore,loopChance}
 from '../src/worldgen/circulation-grammar.ts';
import {activateSite,route} from '../src/breach-core.ts';
test('circulation patterns generate physical alternative traversal, not labels alone',()=>{
 const styles=new Set();
 for(let seed=1;seed<=75;seed++){
  const site=generateSite(seed,'standard');
  styles.add(site.circulationStyle);
  assert.ok(site.doors.length>=3);
  assert.ok(site.planFamily);
  assert.deepEqual(site,generateSite(seed,'standard'));
  activateSite(site);
  try{assert.ok(route(site.spawn[0],site.objective).length);}
  finally{activateSite(null);}
 }
 assert.ok(styles.size>=4);
 assert.ok(circulationScore('enfilade',
  {role:'living',hall:false},{role:'dining',hall:false})<
  circulationScore('spine',
  {role:'living',hall:false},{role:'dining',hall:false}));
 assert.ok(loopChance('loop',{role:'sales'},{role:'office'})>
   loopChance('spine',{role:'sales'},{role:'office'}));
 assert.equal(loopChance('loop',{role:'exam'},{role:'waiting'}),0);
 assert.equal(circulationFor('motel',0),'gallery');
});
