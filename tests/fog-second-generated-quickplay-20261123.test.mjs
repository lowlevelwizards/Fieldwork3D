/** Back-to-back generated maps reuse one tactical renderer in Quick Play.
 * This constrains what the fog renderer may clear near living friendly feet,
 * even with an operator staring into a nearby wall or other teammates down.
 * Other geometry and discovery stay owned by the actual Session.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {newSession,team} from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {paintFogVisibility} from '../src/breach-fog-mask.ts';
import {fogSessionFingerprint} from '../src/breach-fog-cache.ts';
import {replaceTacticalFogGeometry} from '../src/rendering/breach-fog-mesh-composition.ts';
import {sessionWorldGeometry} from '../src/breach-world-context.ts';

const near=(a,b)=>Math.abs(a-b)<1e-6;
function recordingMask(){
 const records=[];
 let path=[];
 const canvas={width:320,height:370};
 const ctx={
  canvas,filter:'none',fillStyle:'#fff',
  globalCompositeOperation:'source-over',
  save(){},restore(){},setTransform(){},
  beginPath(){path=[];},
  moveTo(x,y){path.push({x,y});},
  lineTo(x,y){path.push({x,y});},
  closePath(){},
  fill(){records.push({style:typeof this.fillStyle==='object'?'graded-cone':this.fillStyle,mode:this.globalCompositeOperation,
    points:path.map(p=>({...p}))});},
  createRadialGradient(){
   return {addColorStop(){}};
  }
 };
 return {ctx,records};
}
test('two freshly generated missions each clear ONLY their own operator-foot patch',()=>{
 try{
  const first=newSession(0,23,'exterior-known','small');
  const second=newSession(0,97,'exterior-known','standard');
  assert.notEqual(first.site,second.site);
  assert.notEqual(fogSessionFingerprint(first),fogSessionFingerprint(second));
  const oldSeen=first.seenGround.size,newSeen=second.seenGround.size;
  const render=session=>{
   const mask=recordingMask();
   paintFogVisibility(mask.ctx,session);
   return mask.records;
  };
  const before=render(first);
  const after=render(second);
  assert.deepEqual(render(first),before,
   'repainting a prior session after a new map may not borrow its geometry');
  assert.equal(first.seenGround.size,oldSeen);
  assert.equal(second.seenGround.size,newSeen,
   'local visible ground cannot change authoritative discovery');
  for(const [session,records] of [[first,before],[second,after]]){
   const living=team(session).filter(a=>a.health>0);
   const feet=records.filter(r=>r.style==='#fff');
   assert.equal(feet.length,living.length);
   assert.ok(records.every(r=>r.mode==='destination-out'));
   for(let i=0;i<living.length;i++){
    const p=living[i].p,vertices=feet[i].points;
    assert.equal(vertices.length,4);
    assert.ok(near(vertices[0].x,p.x-5)&&near(vertices[0].y,p.y-5));
    assert.ok(near(vertices[2].x,p.x+5)&&near(vertices[2].y,p.y+5));
    assert.ok(Math.hypot(5,5)<8,
     'the visible square stays strictly inside the real body radius');
   }
  }
  assert.notDeepEqual(
   before.filter(r=>r.style==='#fff').map(r=>r.points),
   after.filter(r=>r.style==='#fff').map(r=>r.points),
   'second map must never re-use first mission actor anchors');
  assert.notEqual(sessionWorldGeometry(first).site,sessionWorldGeometry(second).site);
 }finally{activateSite(null);}
});

test('two consecutive generated-site fog mesh swaps retain shared material but replace footprint',()=>{
 const first=newSession(0,23,'exterior-known','small');
 const second=newSession(0,97,'exterior-known','standard');
 const shared=new THREE.MeshBasicMaterial();
 const smooth=new THREE.Mesh(new THREE.PlaneGeometry(1,1),shared);
 const exterior=new THREE.Mesh(new THREE.BufferGeometry(),shared);
 try{
  const a=replaceTacticalFogGeometry(smooth,exterior,first.site);
  const oldSmooth=smooth.geometry,oldExterior=exterior.geometry;
  const oldExteriorPoints=Array.from(oldExterior.getAttribute('position').array);
  const b=replaceTacticalFogGeometry(smooth,exterior,second.site);
  assert.notEqual(smooth.geometry,oldSmooth);
  assert.notEqual(exterior.geometry,oldExterior);
  assert.deepEqual(b,second.site.bounds);
  // Procedural maps may share world bounds but have very different rooms.
  assert.deepEqual(a,first.site.bounds);
  assert.notDeepEqual(oldExteriorPoints,
   Array.from(exterior.geometry.getAttribute('position').array),
   "the second site must replace the previous indoor fog footprint");
  assert.equal(smooth.material,shared);
  assert.equal(exterior.material,shared);
  const params=smooth.geometry.parameters;
  assert.ok(near(params.width,b.maxX-b.minX));
  assert.ok(near(params.height,b.maxY-b.minY));
 }finally{
  smooth.geometry.dispose();exterior.geometry.dispose();shared.dispose();
  activateSite(null);
 }
});
