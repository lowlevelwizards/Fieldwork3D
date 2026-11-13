import test from 'node:test';
import assert from 'node:assert/strict';
import {ACH_MICH_COVER_OFFSET,createAchMichDrapedGeometry} from '../src/operator-ach-mich-cover-drape.ts';
import {headwearCuboidVolumes,ACH_MICH_SHELLS} from '../src/operator-headwear-silhouettes.ts';
test('H6.6 cloth has clearance above crown and beyond shell width',()=>{
 assert.ok(ACH_MICH_COVER_OFFSET>=.19&&ACH_MICH_COVER_OFFSET<.26);
 for(const shell of ACH_MICH_SHELLS){
  const cover=createAchMichDrapedGeometry(shell);
  const roof=headwearCuboidVolumes(shell)[0];
  const top=roof.y+roof.height/2;
  cover.computeBoundingBox();
  assert.ok(cover.boundingBox.max.y>top+.17);
  assert.equal(cover.userData.h66CoverShellClearance,ACH_MICH_COVER_OFFSET);
 }
});
