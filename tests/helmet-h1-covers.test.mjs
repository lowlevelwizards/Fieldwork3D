import test from 'node:test';
import assert from 'node:assert/strict';
import {modernHelmetCoverVolumes} from '../src/operator-helmet-cover-geometry.ts';
import {headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
test('modern cover is a material envelope over authored shell cut',()=>{
 for(const id of ['ach','pasgt','high-cut','mich-2001','mich-2002','fast-sf','fast-xp-mid']){
  const source=headwearCuboidVolumes(id);
  const cover=modernHelmetCoverVolumes(id);
  assert.equal(cover.length,source.length);
  cover.forEach((p,i)=>{
   assert.ok(p.width>source[i].width);
   assert.ok(p.height>source[i].height);
   assert.ok(p.y-p.height/2>=source[i].y-source[i].height/2-.0001);
  });
 }
});
