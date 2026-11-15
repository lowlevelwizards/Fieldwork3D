import test from 'node:test';
import assert from 'node:assert/strict';
import {shouldProbeRepeatedDoorRehearsal,fullySweptRehearsalExit}
 from '../src/breach-retail-rehearsal-recovery.ts';
const p=(x,y)=>({x,y});
const actor=()=>({side:'blue',p:p(246,397),squeeze:false,
  plan:[{id:71,kind:'move',p:p(128.4,313.5)}]});

test('D3.14D2: only three independently accepted same-door GO-rehearsals trigger',()=>{
 const a=actor(),g=a.plan[0].p;
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D2',1.55,10),false);
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D2',1.55,10.1),false,
   'same-tick callback cannot simulate another physical circuit');
 a.p=p(247,398);
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D2',1.55,12.6),false);
 a.p=p(246,397);
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D2',1.55,15.2),true);
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D2',1.55,17.8),false,
   'one expensive full-route probe for an unchanged unproductive circuit');
});

test('D3.14D2: progress, hinge, door, order and GO invalidate old evidence',()=>{
 const a=actor(),g=a.plan[0].p;
 shouldProbeRepeatedDoorRehearsal(a,g,'D2',1.55,1);
 a.p=p(188,344);
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D2',1.55,3),false);
 a.p=p(246,397);
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D3',1.55,5),false);
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D3',1.1,7),false);
 a.plan[0]={id:72,kind:'move',p:g};
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,g,'D3',1.1,9),false);
 a.plan[0]={id:73,kind:'move',p:p(128.2,320)};
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,a.plan[0].p,'D3',1.1,11),false);
 a.plan[0]={id:74,kind:'watch',p:p(128,320)};
 assert.equal(shouldProbeRepeatedDoorRehearsal(a,p(128,320),'D3',1.1,14),false);
});

test('D3.14D2: invalid speculative, partially swept or fake GO rejected',()=>{
 const from=p(267,390),goal=p(128,313);
 const safe=[p(256,416),p(208,416),p(144,400),goal];
 assert.deepEqual(fullySweptRehearsalExit(from,goal,safe,()=>true),safe);
 let calls=0;
 assert.deepEqual(fullySweptRehearsalExit(from,goal,safe,
   (a,b)=>{calls++;return b.x!==208;}),[]);
 assert.equal(calls,2,'every full-body leg requires physical approval');
 assert.deepEqual(fullySweptRehearsalExit(from,goal,safe.slice(0,2),()=>true),[],
   'a short doorway stage is not the authored GO');
 assert.deepEqual(fullySweptRehearsalExit(from,goal,[p(900,900),goal],()=>true),[],
   'unbounded detours are not valid cold rescue paths');
 assert.deepEqual(fullySweptRehearsalExit(from,goal,[],()=>true),[]);
});
