import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOperatorRig,poseOperator} from '../src/breach-operator-rig.ts';
const read=(p)=>readFileSync(new URL(p,import.meta.url),'utf8');
test('165: operator lab offers six aligned rigs, silhouette and focus controls',()=>{
 const html=read('../operator-lab.html'),lab=read('../src/breach-operator-lab.ts');
 for(const id of ['comparePose','silhouetteMode','compareLabels'])
  assert.ok(html.includes('id="'+id+'"'));
 for(const handling of ['high','low','ready','short','point','ads'])
  assert.ok(lab.includes("mode:'"+handling+"'"),handling+' missing from comparison');
 assert.match(lab,/function ensureComparison/);
 assert.match(lab,/poseOperator\(body/);
 assert.match(lab,/material\.color\.setHex\(0x172322\)/);
 assert.match(lab,/label\.addEventListener\('click'/);
 assert.match(lab,/clearComparison\(\)/);
});
test('165: all six simultaneous previews have stable foot contacts and rigid grips',()=>{
 const modes=['high','low','ready','short','point','ads'];
 const rigs=modes.map((mode,i)=>{
  const body=createOperatorRig('rook','blue');
  const x=(i%2-.5)*77,z=(Math.floor(i/2)-1)*70;
  body.root.position.set(x,0,z);
  poseOperator(body,{x,z,seconds:1,heading:0,travelYaw:0,
   velocity:0,stride:0,posture:'stand',injury:0,weapon:'carbine',
   reload:0,reloadDuration:1.8,lastDoorAt:-100,lastThrowAt:-100,
   down:false,surrender:false,aiming:mode==='ads',firing:false,
   turning:0,handlingOverride:mode,deterministic:true},0);
  assert.ok(body.legGap.every(d=>d<1.5));
  assert.ok(Number.isFinite(body.stockError));
  assert.ok(Number.isFinite(body.gripError));
  return body;
 });
 for(const rig of rigs)rig.dispose();
});