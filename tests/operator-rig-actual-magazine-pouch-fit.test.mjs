import test from 'node:test';
import assert from 'node:assert/strict';
import {carriedMagazineGeometry} from '../src/operator-carried-magazines.ts';
import {ARSENAL_MAGAZINE_CAPACITIES}
 from '../src/arsenal/magazine-identities.ts';
import {RIG_MAGAZINE_MOUTHS,RIG_MAGAZINE_POUCH_PUFF}
 from '../src/operator-armor-rig-silhouettes.ts';
import {rigVisualBudget} from '../src/operator-rig-visual-standards.ts';
import {armorMountedMagazineSocket}
 from '../src/operator-armor-attachment-frame.ts';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';

// Actual external pouch geometry, not a guessed box around a fictitious
// generic magazine. X is forward and these dimensions are authored rig-local.
const CELLS={
 'chest-placard':[[8.74,1.08],[8.74,1.08],[8.74,1.08]],
 'micro-rig':[[8.54,.91],[8.54,.91],[7.75,.77],[7.75,.77]],
 'light-rig':Array.from({length:4},()=>[8.38,1.10]),
 'chicom-rig':Array.from({length:3},()=>[8.52,1.06]),
 'bandolier':Array.from({length:4},()=>[8.20,.78]),
 'split-front':Array.from({length:4},()=>[8.77,1.11]),
 'full-chest':Array.from({length:4},()=>[8.65,1.17]),
 lbv:Array.from({length:4},()=>[8.12,.99]),
 'sadf-webbing':Array.from({length:4},()=>[7.78,1.52])
};
test('all authored real weapon magazines nest behind the front of every rig pouch',()=>{
 // The same magazine geometry is used by the player and the Operator Lab;
 // check the actual rendered extrusion for every authorable AR/AK/HK part.
 const ids=Object.keys(ARSENAL_MAGAZINE_CAPACITIES);
 const profiles=ids.map(id=>{
  const geometry=carriedMagazineGeometry(id);
  assert.ok(geometry,id+' has an actual carried magazine silhouette');
  geometry.computeBoundingBox();
  const forward=geometry.boundingBox.max.x;
  geometry.dispose();
  return {id,forward};
 });
 assert.ok(profiles.length>=15);
 assert.ok(RIG_MAGAZINE_POUCH_PUFF>=.8);
 for(const [rig,cells] of Object.entries(CELLS)){
  const frame=rigContactFrame('plate-standard','bdu-shirt',rig);
  const projection=rigVisualBudget(rig).projection;
  assert.equal(RIG_MAGAZINE_MOUTHS[rig].length,cells.length,
   rig+' physical magazine mouth count matches its fabric cases');
  for(const [i,[x,depth]] of cells.entries()){
   // The pouch rear stays on its original mounting surface; only its outer
   // face gains volume, so it cannot sink farther into armor or clothes.
   const outerFace=x+depth/2+projection+RIG_MAGAZINE_POUCH_PUFF+
    frame.rigShiftX;
   const socket=armorMountedMagazineSocket(rig,i,'plate-standard',1,'bdu-shirt');
   for(const p of profiles)
    assert.ok(outerFace>=socket.x+p.forward+.10,
     rig+' case '+i+' does not contain '+p.id+' (front clearance)');
   const [mouthX]=RIG_MAGAZINE_MOUTHS[rig][i];
   assert.ok(Math.abs(mouthX+frame.rigShiftX-outerFace)<.11,
    rig+' slit remains on the expanded outer face');
  }
 }
});
