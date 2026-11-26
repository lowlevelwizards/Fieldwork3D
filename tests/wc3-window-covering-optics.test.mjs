import test from 'node:test';
import assert from 'node:assert/strict';
import {windowCoveringOpticalStrips,coveringStripsBlockRay,sessionCoveringOptics,setSessionWindowCovering} from '../src/breach-window-covering-optics.ts';
import {opticalBlockerSegments} from '../src/breach-optical-occlusion.ts';
import {lightBeamBlockers,lightRayDistance} from '../src/equipment-weapon-light-beam.ts';
import {visionPolygon} from '../src/breach-vision-polygon.ts';
import {ReplayWindowObservationRecorder,ReplayWindowKnowledgeHistory} from '../src/breach-replay-window-knowledge.ts';
const window={id:'W',x:50,y:50,width:48,vertical:false,sillHeight:14,headHeight:46};
const c=(family,opening=0,tilted=false)=>({family,opening,side:1,palette:'linen',tilted});
const a={x:50,y:10},b={x:50,y:90};
test('closed conceals bidirectionally, open and tilted transmit, surface observable',()=>{
 for(const family of ['curtain','vertical-blind','horizontal-blind','roller-shade','hinged-shutter','rolling-shutter']){
  const strips=windowCoveringOpticalStrips(window,c(family));
  assert.equal(coveringStripsBlockRay(strips,a,b,32),true,family);
  assert.equal(coveringStripsBlockRay(strips,b,a,32),true);
  assert.equal(coveringStripsBlockRay(strips,a,{x:50,y:50},32),false);
  assert.equal(windowCoveringOpticalStrips(window,c(family,1)).length,0);
 }
 for(const family of ['vertical-blind','horizontal-blind'])assert.equal(windowCoveringOpticalStrips(window,c(family,0,true)).length,0);
});
test('partial openings match broad panel placement and height',()=>{
 const strips=windowCoveringOpticalStrips(window,c('curtain',.5));
 assert.equal(coveringStripsBlockRay(strips,a,b,32),false);
 assert.equal(coveringStripsBlockRay(strips,{x:30,y:10},{x:30,y:90},32),true);
 const raised=windowCoveringOpticalStrips(window,c('roller-shade',.5));
 assert.equal(coveringStripsBlockRay(raised,a,b,22),false);
 assert.equal(coveringStripsBlockRay(raised,a,b,32),true);
 assert.equal(coveringStripsBlockRay(raised,a,b,20,44),true);
});
test('fog and light share optical geometry',()=>{
 const edges=windowCoveringOpticalStrips(window,c('curtain')).map(x=>x.edge);
 assert.deepEqual(opticalBlockerSegments([],[],[],false,edges),edges);
 assert.deepEqual(lightBeamBlockers([],[],[],edges),edges);
 assert.ok(lightRayDistance(a,Math.PI/2,100,edges)<=40.01);
 assert.ok(visionPolygon(a,Math.PI/2,100,[],[],false,[],edges).some(p=>Math.abs(p.y-50)<.01));
});
test('session cache follows revision and replay array replacement',()=>{
 const s={windows:[{...window,covering:c('curtain')}],objectRevision:0,coverState:[],doors:[],site:null};
 const first=sessionCoveringOptics(s);assert.strictEqual(first,sessionCoveringOptics(s));
 assert.equal(first.strips.length,2);
 assert.equal(setSessionWindowCovering(s,'W',c('curtain',1)),true);
 assert.equal(sessionCoveringOptics(s).strips.length,0);
 s.windows=[{...window,covering:c('curtain')}];assert.equal(sessionCoveringOptics(s).strips.length,2);
 assert.equal(first.strips.length,2);
});
test('covering evidence is per observer and never inferred before discovery',()=>{
 const s={seconds:0,operators:[{id:'A',side:'blue',health:100},{id:'B',side:'blue',health:100}],windows:[{...window,open:false,shattered:false,covering:c('curtain')}]};
 const rec=new ReplayWindowObservationRecorder();rec.capture(s,(_s,a)=>a.id==='A');
 s.seconds=1;s.windows[0].covering=c('curtain',1);rec.capture(s,(_s,a)=>a.id==='B');
 const h=new ReplayWindowKnowledgeHistory(rec.observations);
 assert.equal(h.at(.5,'A','W').covering.opening,0);assert.equal(h.at(.5,'B','W'),null);
 assert.equal(h.at(1,'B','W').covering.opening,1);assert.equal(h.at(1,'A','W').covering.opening,0);
});
