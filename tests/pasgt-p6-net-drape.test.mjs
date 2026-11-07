import test from 'node:test';
import assert from 'node:assert/strict';
import {createPasgtNetGeometry} from '../src/operator-pasgt-field-dress.ts';
test('six sparse diamond net strands terminate at retaining band, not below rim',()=>{
 const g=createPasgtNetGeometry();
 assert.equal(g.userData.pasgtNetCoverContact,true);
 assert.equal(g.userData.pasgtNetTuckedUnderBand,true);
 assert.equal(g.userData.pasgtNetCordCount,6);
 assert.ok(g.boundingBox.min.y>5.18);
 assert.ok(g.boundingBox.max.y>8.8);
 assert.ok(g.getAttribute('position').count>=300);
});
