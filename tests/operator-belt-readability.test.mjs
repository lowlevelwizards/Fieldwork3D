import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {beltBandGeometry} from '../src/operator-belt-visuals.ts';
import {BELT_STYLES} from '../src/operator-belt-profile.ts';
import {gearPixelMap} from '../src/operator-gear-pixel-art.ts';
import {ART_PIXEL} from '../src/rendering/material-art-scale.ts';
import {attachmentFootprint,attachmentMountRequest} from '../src/operator-attachment-catalog.ts';
import {resolveBeltMounts} from '../src/operator-belt-mounts.ts';
import {beltSurface} from '../src/operator-belt-frame.ts';
test('BT3R: continuous belt has only 64 triangles and correctly outward front normals',()=>{
 for(const style of BELT_STYLES.slice(1)){
  const geo=beltBandGeometry(style),p=geo.getAttribute('position'),n=geo.getAttribute('normal');
  assert.equal(p.count/3,64);
  assert.ok(n.getX(0)>.9);
  assert.ok(geo.getAttribute('uv1').count===p.count);
  assert.ok([...p.array].every(Number.isFinite));
  geo.dispose();
 }
});
test('BT3R: details are nearest-filtered metric texture pixels, not overlay geometry',()=>{
 const map=gearPixelMap('webbing',8,3);
 assert.equal(map.image.width,Math.ceil(8/ART_PIXEL));
 assert.equal(map.image.height,Math.ceil(3/ART_PIXEL));
 assert.equal(map.magFilter,THREE.NearestFilter);
 assert.equal(map.channel,1);
 assert.ok(map.image.data.some(x=>x<200));
});
test('BT3R: larger footprints and higher mounting origins',()=>{
 assert.ok(attachmentFootprint('primary-mag-pouch').width>=3.2);
 assert.ok(attachmentFootprint('rigid-holster').depth>=2.2);
 assert.ok(attachmentFootprint('shell-holder').width>=5);
 const request=attachmentMountRequest('mag','primary-mag-pouch','battle-belt','standard','right-hip');
 const r=resolveBeltMounts('battle-belt',[request]);
 assert.equal(r.mounts.length,1);
 const s=r.mounts[0].socket,baseline=beltSurface('battle-belt',2,-.25);
 assert.ok(s.y>baseline.y+1);
});

test('BT3R: long hip attachments retain direct belt contact',()=>{
 const q=attachmentMountRequest('pouch','primary-mag-pouch','battle-belt','standard','right-hip');
 const m=resolveBeltMounts('battle-belt',[q]).mounts[0];
 const contact=beltSurface('battle-belt',m.segment,(m.interval[0]+m.interval[1])/2);
 assert.equal(m.socket.z,contact.z);assert.equal(m.socket.x,contact.x);
 assert.ok(Math.abs(m.socket.tilt)<.1);
});
