import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SITE_EXTERIOR_ZONE_COLORS,SITE_PROPERTY_SURFACE_COLORS} from '../src/rendering/breach-site-surface-policy.ts';
const source=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');
test('site material policy remains a complete color catalog',()=>{
 for(const kind of ['yard','patio','driveway','service','garden','parking'])
  assert.ok(Number.isInteger(SITE_EXTERIOR_ZONE_COLORS[kind]));
 for(const kind of ['sidewalk','curb-ramp','parking-divider','access-hatch'])
  assert.ok(Number.isInteger(SITE_PROPERTY_SURFACE_COLORS[kind]));
});
test('scene delegates deterministic micro-debris geometry instead of duplicating it',()=>{
 const scene=source('breach-3d.ts'),builder=source('rendering/breach-site-micro-debris.ts');
 assert.match(scene,/buildSiteMicroDebrisMeshes\(site/);
 assert.doesNotMatch(scene,/planMicroDebris\(site\)/);
 assert.match(builder,/planMicroDebris\(site\)/);
 assert.match(builder,/new THREE.InstancedMesh/);
});
