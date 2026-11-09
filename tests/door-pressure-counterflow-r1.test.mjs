import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {activateSite,doorLeafSegment,pointToSegment} from '../src/breach-core.ts';
import {initDoor,advanceDoor,pressDoorOnBodyAttempt} from '../src/breach-door.ts';
import {newSession,team,planMove,toggling,stepSession} from '../src/breach-game.ts';

const p=(x,y)=>({x,y});
const gap=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const makeDoor=()=>initDoor({id:'ENTRY',a:p(290,260),b:p(332,260),
  hinge:'a',swing:-1,kind:'hinged',open:true,openedAt:0},0);
function opposingPressure(d){
 const leaf=doorLeafSegment(d),mid=p((leaf.a.x+leaf.b.x)/2,
   (leaf.a.y+leaf.b.y)/2);
 const length=gap(leaf.a,leaf.b);
 const normal=p(-(leaf.b.y-leaf.a.y)/length,
   (leaf.b.x-leaf.a.x)/length);
 const next=doorLeafSegment({...d,openFraction:1.08});
 const candidate=sign=>p(mid.x+normal.x*14*sign,
   mid.y+normal.y*14*sign);
 const a=candidate(1),b=candidate(-1);
 const away=from=>pointToSegment(from,next)-pointToSegment(from,leaf);
 const opening=away(a)>away(b)?a:b;
 const closing=opening===a?b:a;
 return {opening:{from:opening,to:closing},
   closing:{from:closing,to:opening}};
}
test('contested opposing body pressure never reverses open hinge into a close',()=>{
 const door=makeDoor(),pressure=opposingPressure(door);
 for(let i=0;i<90;i++){
  const close=pressDoorOnBodyAttempt(pressure.closing.from,
    pressure.closing.to,[door],1/60,[pressure.closing.from,
      pressure.opening.from],{deferClosing:d=>d.id==='ENTRY'});
  assert.equal(close,null,'closing contact must yield to active opposite passage');
  assert.equal(door.open,true,'the opposing body may not arm a closing hinge');
  pressDoorOnBodyAttempt(pressure.opening.from,pressure.opening.to,
    [door],1/60,[pressure.opening.from,pressure.closing.from]);
  advanceDoor(door,1/60,[pressure.opening.from,pressure.closing.from]);
  assert.equal(door.open,true,'opening side retains hinge direction');
 }
 assert.ok(door.openFraction>.7,'door cannot be repeatedly slammed shut');
});
test('solo closing pressure still works when there is no competing crossing',()=>{
 const door=makeDoor(),{closing}=opposingPressure(door);
 const old=door.openFraction;
 const close=pressDoorOnBodyAttempt(closing.from,closing.to,[door],
   1/30,[closing.from]);
 assert.equal(close?.doorId,'ENTRY');
 assert.equal(door.open,false,'ordinary body-driven close remains physical');
 for(let i=0;i<10;i++)advanceDoor(door,1/60,[closing.from]);
 assert.ok(door.openFraction<old,'leaf should be able to move toward the frame');
});
test('game motor protects both no-route and normal movement pressure paths',()=>{
 const src=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
 assert.equal((src.match(/deferClosing:door=>doorClosingContested\(s,a,door\)/g)||[]).length,2);
 assert.match(src,/crossingDoor\(\{[\s\S]*?goal,side:peer.side/);
});
const door={id:'ENTRY',a:p(290,260),b:p(332,260),
  open:true,openedAt:0,hinge:'a',swing:-1,kind:'hinged'};
const site={seed:1909,name:'COUNTERFLOW HINGE',layout:'corridor',training:true,
 rooms:[],roomCount:0,
 walls:[{a:p(90,260),b:p(290,260)},{a:p(332,260),b:p(550,260)}],
 doors:[door],cover:[],entrance:p(311,260),
 spawn:[p(306,215),p(309,308),p(240,150),p(390,370)],
 enemies:[],windows:[],objective:p(520,450),extract:p(520,460),
 bounds:{minX:0,minY:0,maxX:640,maxY:500}};
test('two friendly opposite-direction movements do not close-pong the live doorway',()=>{
 const s=newSession(0,undefined,'full-view','standard','hold',site);
 try{
  const [north,south]=team(s);
  const northGoal=p(307,355),southGoal=p(312,177);
  assert.equal(planMove(s,north.id,northGoal),true);
  assert.equal(planMove(s,south.id,southGoal),true);
  toggling(s);
  let reversals=0,wasOpen=s.doors[0].open;
  for(let tick=0;tick<1050&&s.phase==='running';tick++){
   stepSession(s,1/30);
   const open=s.doors[0].open;
   if(open!==wasOpen){reversals++;wasOpen=open;}
   if(!north.plan.length&&!south.plan.length)break;
  }
  assert.ok(reversals<=3,'two friendlies must not cause repeated door-open/close reversals: '+reversals);
  assert.ok(north.p.y>280&&south.p.y<240,
    'counterflow must clear threshold rather than remain in a hinge fight: '+
    JSON.stringify({north:north.p,south:south.p,
      motor:[north.motorPause,south.motorPause],door:s.doors[0].openFraction}));
 }finally{activateSite(null);}
});
