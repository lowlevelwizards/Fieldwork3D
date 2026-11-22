/** OC3/5: physical optional intel must be seen, collected and extracted. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateOptionalIntel,observeOptionalIntel,beginOptionalIntelGather,
 advanceOptionalIntel,autoBeginOptionalIntelGather,collectProximityOptionalIntel,
 eligibleOptionalIntel,optionalIntelRecovered}
 from '../src/breach-optional-intel.ts';
const rooms=Array.from({length:12},(_,i)=>({
 id:'room'+i,kind:'room',x:(i%4)*120,y:Math.floor(i/4)*120,
 w:105,h:105
}));
const site={seed:2331,rooms,roomCount:12,objective:{x:525,y:525},
 cover:[],extract:{x:610,y:0}};
const visible=()=>true;
const soldier=(id,x,y,health=4)=>({id,side:'blue',p:{x,y},health});
test('OC3 deterministic side evidence has compact, nontraining, nonobjective distribution',()=>{
 const a=generateOptionalIntel(site),b=generateOptionalIntel(site);
 assert.deepEqual(a,b);
 assert.equal(a.length,3);
 assert.equal(new Set(a.map(i=>i.roomId)).size,3);
 assert.ok(a.every(i=>i.discovered===false&&i.collectedBy===null));
 assert.deepEqual(generateOptionalIntel({...site,training:true}),[]);
 assert.deepEqual(generateOptionalIntel(undefined),[]);
});
test('OC3 only observed intel can be gathered, collection is timed and interruptible',()=>{
 const item=generateOptionalIntel(site)[0];
 const s={phase:'planning',seconds:0,optionalIntel:[item],
  intelGather:null,scenario:{extract:{x:610,y:0}},
  operators:[soldier('rook',item.p.x,item.p.y)]};
 assert.equal(beginOptionalIntelGather(s,'rook',visible),false,'no knowledge leak');
 assert.equal(observeOptionalIntel(s.optionalIntel,()=>false),0);
 assert.equal(item.discovered,false);
 assert.equal(observeOptionalIntel(s.optionalIntel,()=>true),1);
 assert.equal(observeOptionalIntel(s.optionalIntel,()=>true),0,'one discovery');
 assert.equal(eligibleOptionalIntel(s,'rook',()=>false),null,'blocked contact');
 assert.equal(beginOptionalIntelGather(s,'rook',visible),true);
 assert.equal(beginOptionalIntelGather(s,'rook',visible),false);
 s.phase='running';
 assert.equal(advanceOptionalIntel(s,.75,visible),null);
 s.operators[0].p.x+=60;
 assert.equal(advanceOptionalIntel(s,.75,visible),null);
 assert.equal(s.intelGather,null,'movement interrupted collection');
 s.operators[0].p.x=item.p.x;
 assert.equal(beginOptionalIntelGather(s,'rook',visible),true);
 s.seconds=1.21;
 assert.equal(advanceOptionalIntel(s,1.21,visible)?.id,item.id);
 assert.equal(item.collectedAt,1.21);
 assert.equal(item.collectedBy,'rook');
 assert.equal(beginOptionalIntelGather(s,'rook',visible),false,'unique item credit');
});
test('observed evidence starts timed pickup automatically within physical reach',()=>{
 const item=generateOptionalIntel(site)[0];
 const s={phase:'running',seconds:0,optionalIntel:[item],intelGather:null,
  scenario:{extract:{x:610,y:0}},operators:[soldier('rook',item.p.x,item.p.y)]};
 assert.equal(autoBeginOptionalIntelGather(s,visible),false);
 item.discovered=true;
 assert.equal(autoBeginOptionalIntelGather(s,()=>false),false);
 assert.equal(autoBeginOptionalIntelGather(s,visible),true);
 assert.equal(s.intelGather?.operatorId,'rook');
 assert.equal(autoBeginOptionalIntelGather(s,visible),false);
 assert.equal(advanceOptionalIntel(s,1.21,visible)?.id,item.id);
 assert.equal(autoBeginOptionalIntelGather(s,visible),false);
});
test('OC3 actual courier custody, casualty drop, recovery and extraction',()=>{
 const item=generateOptionalIntel(site)[0];
 const s={phase:'running',seconds:2,optionalIntel:[{...item,discovered:true,
  collectedBy:'rook',collectedAt:2}],
  intelGather:null,scenario:{extract:{x:610,y:0}},
  operators:[soldier('rook',0,0),soldier('moss',30,0)]};
 assert.equal(optionalIntelRecovered(s).length,0,'carried in map is not extracted');
 s.operators[0].health=0;
 advanceOptionalIntel(s,.1,visible);
 assert.equal(s.optionalIntel[0].collectedBy,null,'downed courier drops evidence');
 assert.deepEqual(s.optionalIntel[0].p,{x:0,y:0});
 s.operators[1].p={x:0,y:0};
 assert.equal(beginOptionalIntelGather(s,'moss',visible),true);
 s.seconds=3.5;
 assert.equal(advanceOptionalIntel(s,1.3,visible)?.collectedBy,'moss');
 s.operators[1].p={x:610,y:0};
 assert.equal(optionalIntelRecovered(s).length,1);
 s.operators[1].health=0;
 assert.equal(optionalIntelRecovered(s).length,0,'downed carrier never scores remote pickup');
});

test('OC6 walk-over collection is immediate, visible-only and preserves courier custody',()=>{
 const item=generateOptionalIntel(site)[0];
 const s={phase:'running',seconds:4.25,optionalIntel:[item],intelGather:null,
  scenario:{extract:{x:610,y:0}},
  operators:[soldier('rook',item.p.x+29,item.p.y),
   soldier('moss',item.p.x+35,item.p.y)]};
 assert.equal(collectProximityOptionalIntel(s,visible),null,
  'undiscovered pickups cannot expose hidden evidence');
 item.discovered=true;
 assert.equal(collectProximityOptionalIntel(s,()=>false),null,
  'walls still prevent contact');
 assert.equal(collectProximityOptionalIntel(s,visible)?.id,item.id,
  'walking past within reach collects on the same tick');
 assert.equal(item.collectedBy,'rook');
 assert.equal(item.collectedAt,4.25);
 assert.equal(s.intelGather,null,'no timed interaction required');
 assert.equal(collectProximityOptionalIntel(s,visible),null,
  'the second operator cannot duplicate collection');
 s.operators[0].health=0;
 advanceOptionalIntel(s,1/60,visible);
 assert.equal(item.collectedBy,null,'a downed courier still drops evidence');
 s.operators[1].p={...item.p};
 assert.equal(collectProximityOptionalIntel(s,visible)?.collectedBy,'moss',
  'another teammate can recover dropped evidence immediately');
});
