import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {rigContactFrame} from '../src/operator-rig-contact-frame.ts';
import {rigShoulderRoute,createChestRigSilhouettes,updateFittedRigHarness}
 from '../src/operator-armor-rig-silhouettes.ts';
import {garmentContactAnchor}
 from '../src/operator-garment-contact-surface.ts';
import {ARMOR_FIT_TOPS} from '../src/operator-uniform-fit-envelope.ts';

const rigs=['micro-rig','chest-placard','light-rig','chicom-rig',
 'field-webbing','split-front','full-chest','lbv','sadf-webbing'];
test('RIG-R6 front shoulder joins angle inward and finish on visible top surfaces',()=>{
 for(const top of ARMOR_FIT_TOPS)
  for(const armor of ['armor-bare','plate-standard','soft-flak'])
   for(const rig of rigs){
    const f=rigContactFrame(armor,top,rig);
    const real=garmentContactAnchor(top,5.2).topY;
    assert.ok(Math.abs(f.shoulderY-real-.16)<.001,
     top+'/'+rig+' supported crown, no empty clearance');
    for(const sign of [-1,1]){
     const front=[7.95,1.0,sign*3.75];
     const back=[f.back.x-f.rigShiftX,-1.0,sign*3.75];
     const p=rigShoulderRoute(top,f,front,back,sign);
     assert.equal(p.length,8,'explicit front slope, crown and rear return');
     assert.deepEqual(p[0],front);
     assert.deepEqual(p[p.length-1],back);
     assert.ok(p[2][0]<p[1][0]&&p[3][0]<p[2][0],
      rig+' top front moves back instead of floating straight up');
     assert.ok(p[2][1]>p[1][1]&&p[3][1]>p[2][1],
      rig+' short upward diagonal shoulder joining pieces');
     assert.ok(p[4][1]<=real+.17&&p[4][1]>=real-.04,
      rig+' upper bridge actually rides near garment top');
     for(const point of p)for(const number of point)
      assert.ok(Number.isFinite(number));
    }
   }
});
test('RIG-R6 harness geometry remains stable and non-degenerate across changes',()=>{
 const chest=new THREE.Group();
 const m=new THREE.MeshStandardMaterial();
 const g=createChestRigSilhouettes(chest,m,m,m,m);
 for(const [top,rig] of [
  ['bdu-shirt','micro-rig'],
  ['acu-shirt','split-front'],
  ['smock-jacket','full-chest'],
  ['gorka-jacket','sadf-webbing']
 ]){
  const f=rigContactFrame('armor-bare',top,rig);
  updateFittedRigHarness(g,rig,top,f);
  const h=g[rig].getObjectByName('uniform-fitted-rig-harness');
  assert.ok(h&&h.children.length);
  const ids=h.children.map(c=>c.uuid);
  h.traverse(o=>{
   if(o instanceof THREE.Mesh){
    const values=o.geometry.getAttribute('position');
    for(let i=0;i<values.count;i++)
     for(const v of [values.getX(i),values.getY(i),values.getZ(i)])
      assert.ok(Number.isFinite(v),'no folded or missing joins');
   }
  });
  updateFittedRigHarness(g,rig,top,f);
  assert.deepEqual(h.children.map(c=>c.uuid),ids,
   'single fitted rebuild per change');
 }
 chest.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});
 m.dispose();
});
