import test from 'node:test';
import assert from 'node:assert/strict';
import {newSession,team,planMove,stepSession,toggling}
  from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';
import {glideAlongStaticWall,sweptBodyClear}
  from '../src/breach-navigation.ts';
import {resolveMovementFrame} from '../src/breach-movement-authority.ts';
import {newAwareness,addObservation,bestBelief,ageAwareness}
  from '../src/breach-awareness.ts';
import {reportToListener} from '../src/breach-communication.ts';

const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const fixture={
 seed:31041,name:'TACTICAL INTEGRATION / FOUR OPERATOR ENTRY',layout:'corridor',
 training:true,rooms:[],roomCount:0,cover:[],windows:[],
 walls:[{a:{x:90,y:260},b:{x:290,y:260}},
        {a:{x:332,y:260},b:{x:550,y:260}}],
 doors:[{id:'ENTRY',a:{x:290,y:260},b:{x:332,y:260},
  open:false,openedAt:-1,hinge:'a',swing:-1,kind:'hinged'}],
 entrance:{x:310,y:260},
 spawn:[{x:300,y:200},{x:308,y:173},{x:316,y:146},{x:325,y:119}],
 enemies:[],objective:{x:520,y:450},extract:{x:520,y:460},
 bounds:{minX:0,minY:0,maxX:640,maxY:500}
};

test('baseline: four reachable team routes clear a narrow physical threshold',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',fixture);
 try{
  const members=team(s),crossed=new Map(),arrived=new Map();
  const goals=members.map((_,i)=>({x:296+i*10,y:371+i*3}));
  members.forEach((member,i)=>assert.equal(planMove(s,member.id,goals[i]),true));
  const original=members.map(member=>member.plan.map(node=>node.id));
  toggling(s);
  for(let tick=0;tick<1080;tick++){
   stepSession(s,1/30);
   members.forEach((member,i)=>{
    assert.ok(Number.isFinite(member.p.x)&&Number.isFinite(member.p.y));
    if(member.p.y>278&&!crossed.has(member.id))crossed.set(member.id,s.seconds);
    if(dist(member.p,goals[i])<16&&!arrived.has(member.id))
      arrived.set(member.id,s.seconds);
   });
   if(arrived.size===members.length)break;
  }
  console.log('TACTICAL END STATE',JSON.stringify(members.map((a,i)=>({
   id:a.id,p:a.p,goal:goals[i],nav:a.nav.slice(0,3),
   active:a.plan[0]?.kind,blockedTime:a.blockedTime,
   lastBlocker:a.lastBlocker,recoveryAttempts:a.recoveryAttempts,
   velocity:a.velocity,squeeze:a.squeeze,doorState:s.doors[0]?.openFraction
  }))));
  assert.equal(crossed.size,members.length,'all four must pass through');
  assert.equal(arrived.size,members.length,'all four must finish');
  assert.ok(members.every((member,i)=>
    member.plan.every(node=>original[i].includes(node.id))));
  const last=Math.max(...crossed.values()),first=Math.min(...crossed.values());
  assert.ok(last-first<7,'excessive doorway delay: '+(last-first).toFixed(2));
  console.log('TACTICAL BASELINE',JSON.stringify({
   operators:members.length,firstCross:first,lastCross:last,
   lastArrival:Math.max(...arrived.values()),elapsed:s.seconds
  }));
 }finally{activateSite(null);}
});

test('baseline: movement authority rejects hard geometry and never edits actor orders',()=>{
 const proposals=[
  {id:'rook',side:'blue',alive:true,from:{x:10,y:10},to:{x:14,y:10}},
  {id:'enemy',side:'red',alive:true,from:{x:25,y:10},to:{x:25,y:10}},
 ];
 const original=structuredClone(proposals);
 const result=resolveMovementFrame(proposals,p=>p.id!=='rook');
 assert.deepEqual(proposals,original);
 assert.equal(result[0].blocked,'geometry');
 assert.deepEqual(result[0].point,original[0].from);
 assert.equal(result[1].blocked,null);
});

test('baseline: inferred reports remain uncertain and direct observations are precise',()=>{
 const memory=newAwareness();
 assert.equal(addObservation(memory,{
  id:'seen-1',observerId:'guard',source:'visual',subjectId:'rook',
  at:1,estimate:{x:12,y:20},uncertainty:0,kind:'contact'
 }),true);
 assert.equal(bestBelief(memory).uncertainty,0);
 ageAwareness(memory,1,3);
 assert.ok(bestBelief(memory).uncertainty>0);
 const report={
  id:5,senderId:'guard',at:4,origin:{x:20,y:20},
  estimate:{x:80,y:85},uncertainty:30,deliveredTo:[]
 };
 const heard=reportToListener(report,'ally',{x:25,y:20},[],[],4.2);
 assert.ok(heard&&heard.source==='reported');
 assert.ok(heard.uncertainty>=30);
 assert.equal(heard.subjectId,undefined,
  'anonymous reports must not invent exact individual tracking');
});
