import test from 'node:test';
import assert from 'node:assert/strict';
import {cutWallAperture} from '../src/worldgen/architectural-assembly.ts';
import {auditArchitecturalFeatures} from '../src/worldgen/architecture-feature-audit.ts';
import {generateSite} from '../src/breach-site.ts';
test('hosted openings retain walls on either side without mutating inputs',()=>{
 const original=[{a:{x:0,y:0},b:{x:160,y:0}}];
 const out=cutWallAperture(original,0,'portal',96);
 assert.ok(out);assert.equal(original.length,1);
 assert.equal(out.walls.length,2);
 assert.deepEqual([out.aperture.a.x,out.aperture.b.x],[32,128]);
 assert.equal(cutWallAperture(original,0,'invalid',150),null);
});
test('generated architecture has no orphan double leaves',()=>{
 for(let seed=1;seed<=22;seed++){
  const site=generateSite(seed);
  const audit=auditArchitecturalFeatures(site);
  assert.equal(audit.windows,site.windows?.length??0);
  assert.deepEqual(audit.issues,[]);
 }
});
