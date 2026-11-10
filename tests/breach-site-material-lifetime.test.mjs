import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {SiteMaterialLifetime} from '../src/rendering/site-material-lifetime.ts';

test('site-owned materials are released once across repeated site changes',()=>{
  const lifecycle=new SiteMaterialLifetime(),shared={disposed:0,dispose(){this.disposed++;}};
  const first={disposed:0,dispose(){this.disposed++;}};
  const second={disposed:0,dispose(){this.disposed++;}};
  assert.equal(lifecycle.track(first),first);
  lifecycle.track(first);
  lifecycle.track(second);
  assert.equal(lifecycle.size,2);
  lifecycle.reset();
  lifecycle.reset();
  assert.equal(first.disposed,1);
  assert.equal(second.disposed,1);
  assert.equal(shared.disposed,0,'shared materials cannot be accidentally disposed');
  const third={disposed:0,dispose(){this.disposed++;}};
  lifecycle.track(third);
  lifecycle.reset();
  assert.equal(third.disposed,1);
  assert.equal(lifecycle.size,0);
});
test('site-specific curb and door glass materials are not retained by shared palette',()=>{
  const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  const builder=readFileSync(new URL('../src/rendering/breach-site-scene-builder.ts',import.meta.url),'utf8');
  const exterior=readFileSync(new URL('../src/rendering/breach-site-exterior-builder.ts',import.meta.url),'utf8');
  const openings=readFileSync(new URL('../src/rendering/breach-site-openings-builder.ts',import.meta.url),'utf8');
  assert.match(source,/applySite\(site:Site\|null\)\{[\s\S]*?this\.siteMaterials\.reset\(\)/);
  assert.match(builder,/track:material=>host\.siteMaterials\.track\(material\)/);
  assert.match(exterior,/const curbMaterial=host\.track\(/);
  assert.match(openings,/const doorGlass=host\.track\(/);
  assert.doesNotMatch(source,/this\.mats\.push\(curbMaterial\)/);
  assert.doesNotMatch(source,/this\.mats\.push\(doorGlass\)/);
  assert.doesNotMatch(builder,/host\.mats\.push\(curbMaterial\|doorGlass\)/);
});
