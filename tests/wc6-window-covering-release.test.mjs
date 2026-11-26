import test from 'node:test';
import assert from 'node:assert/strict';
import {performance} from 'node:perf_hooks';
import {generateSite} from '../src/breach-site.ts';
import {auditWindowGeometryContract} from '../src/worldgen/window-geometry-contract.ts';
import {windowRoomFaces} from '../src/worldgen/window-covering-placement.ts';
import {initializeWindows} from '../src/breach-windows.ts';
import {normalizeWindowCovering,windowCoveringPieces,COVERING_FAMILIES} from '../src/breach-window-coverings.ts';
import {sessionCoveringOptics,windowCoveringsBlockSight,setSessionWindowCovering} from '../src/breach-window-covering-optics.ts';
import {hardCoveringBlocksTraversal} from '../src/breach-window-covering-physical.ts';
import {windowVisualHeadHeight} from '../src/breach-opening-proportions.ts';
import {canClimbWindow} from '../src/breach-mantle.ts';
const archetypes=['house','townhouse','apartment','retail','office','garage','warehouse','restaurant','motel','utility','clinic'];
test('WC6 real generated maps across all archetypes and sizes retain structural aperture ownership',()=>{
 let windows=0,coverings=0,maxPieces=0,maxStrips=0;const families=new Set();
 for(const [i,archetype] of archetypes.entries()){
  for(const [j,scale] of ['small','standard','large'].entries()){
   const seed=1100+i*11+j*131;
   const site=generateSite(seed,scale,undefined,{}, {archetype});
   assert.deepEqual(auditWindowGeometryContract(site),[],archetype+'/'+scale);
   const states=initializeWindows(site.windows??[]);
   const s={site,windows:states,objectRevision:0};
   const optics=sessionCoveringOptics(s);
   assert.strictEqual(sessionCoveringOptics(s),optics);
   assert.ok(optics.strips.length<=states.length*2);
   maxStrips=Math.max(maxStrips,optics.strips.length);
   windows+=states.length;
   for(const w of states){
    const c=w.covering;if(!c)continue;
    coverings++;families.add(c.family);
    assert.ok(Object.isFrozen(c));assert.strictEqual(normalizeWindowCovering(w),c);
    assert.ok(!['bars','boarded'].includes(w.treatment));
    const faces=windowRoomFaces(site,w);
    assert.ok(faces.length);
    if(c.family.includes('shutter')){
     assert.equal(w.interior===true,false);assert.equal(c.side,-faces[0].side);
     assert.equal(canClimbWindow({...w,shattered:true}),!hardCoveringBlocksTraversal(w)&&w.width>=25&&(w.sillHeight??14)<=30&&(w.headHeight??windowVisualHeadHeight(w.style))-(w.sillHeight??14)>=18);
    }else assert.ok(faces.some(f=>f.side===c.side));
    const pieces=windowCoveringPieces(w,c);maxPieces=Math.max(maxPieces,pieces.length);
    assert.ok(pieces.length>0&&pieces.length<=14);
    assert.ok(pieces.every(p=>[p.x,p.y,p.z,p.w,p.h,p.d,p.yaw??0].every(Number.isFinite)&&p.w>0&&p.h>0&&p.d>0));
   }
  }
 }
 assert.ok(windows>0&&coverings>0);
 console.log('WC6 map sweep '+JSON.stringify({sites:33,windows,coverings,families:[...families],maxPieces,maxStrips}));
});
test('WC6 hot query cache reuses geometry, bounded strip count, isolated sessions and replay restores',()=>{
 const openings=Array.from({length:12},(_,i)=>({id:'W'+i,x:100+i*60,y:200,width:48,vertical:false,sillHeight:14,headHeight:43,covering:{family:COVERING_FAMILIES[i%6],side:1,opening:0,palette:'linen'}}));
 const make=()=>({windows:initializeWindows(openings),site:null,objectRevision:0,illuminationRevision:0});
 const a=make(),b=make(),first=sessionCoveringOptics(a),other=sessionCoveringOptics(b);
 assert.notStrictEqual(first,other);assert.ok(first.strips.length<=24);assert.ok(first.physical.length<=24);
 const start=performance.now();let blocked=0;
 for(let i=0;i<20000;i++){
  const x=100+(i%12)*60;
  if(windowCoveringsBlockSight(a,{x,y:160},{x,y:240},32))blocked++;
  assert.strictEqual(sessionCoveringOptics(a),first);
 }
 console.log('WC6 cache sample '+JSON.stringify({rays:20000,blocked,ms:performance.now()-start,strips:first.strips.length,hard:first.hard.length}));
 assert.equal(blocked,20000);
 const snapshot=a.windows.map(w=>({...w}));
 assert.equal(setSessionWindowCovering(a,'W0',{...a.windows[0].covering,opening:1}),true);
 assert.equal(sessionCoveringOptics(a).byWindow.has('W0'),false);
 assert.strictEqual(sessionCoveringOptics(b),other);
 a.windows=snapshot;a.objectRevision=0;
 assert.equal(sessionCoveringOptics(a).byWindow.has('W0'),true);
 assert.equal(setSessionWindowCovering(a,'W0',snapshot[0].covering),false);
});
