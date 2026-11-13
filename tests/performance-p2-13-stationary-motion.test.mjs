import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {resolveMovementFrame} from '../src/breach-movement-authority.ts';

const p=(x,y)=>({x,y});
test('60Hz stationary arena has no geometry/collision callback or changed results',()=>{
 const operators=Array.from({length:48},(_,i)=>({
  id:'unit:'+i,side:i%3===0?'neutral':i%2?'red':'blue',
  from:p((i%8)*40,(i/8|0)*40),to:p((i%8)*40,(i/8|0)*40),
  alive:i%7!==0,carried:false
 }));
 let checks=0;
 for(let tick=0;tick<360;tick++){
  const decisions=resolveMovementFrame(operators,()=>{checks++;return true;});
  assert.deepEqual(decisions,operators.map(actor=>({
   id:actor.id,point:actor.to,blocked:null
  })));
 }
 assert.equal(checks,0,'stationary bodies must not request swept world checks');
});
test('dead and carried proposals never activate collision without a moving live body',()=>{
 const list=[
  {id:'down',side:'red',from:p(2,0),to:p(10,0),alive:false},
  {id:'carried',side:'neutral',from:p(20,0),to:p(25,0),alive:true,carried:true},
  {id:'hold',side:'blue',from:p(50,0),to:p(50,0),alive:true}
 ];
 let checks=0;
 const result=resolveMovementFrame(list,()=>{checks++;return false;});
 assert.equal(checks,0);
 assert.deepEqual(result.map(x=>x.point),list.map(x=>x.to));
});
test('one genuine moving body still gets full collision and authoritative geometry',()=>{
 const list=[
  {id:'move',side:'red',from:p(0,0),to:p(20,0),alive:true},
  {id:'guard',side:'neutral',from:p(30,0),to:p(30,0),alive:true}
 ];
 let checks=0;
 const result=resolveMovementFrame(list,()=>{checks++;return true;});
 assert.equal(checks,1,'only the moving body needs a world sweep');
 assert.equal(result[0].blocked,'actor');
 assert.deepEqual(result[0].point,p(0,0));
});
test('civilian occupancy preserves live positions without two filtered/spread arrays',()=>{
 const phase=readFileSync(new URL('../src/breach-simulation-motion-phase.ts',import.meta.url),'utf8');
 assert.match(phase,/const nearby:Array<\{id:string;p:Pt\}>=\[\]/);
 assert.match(phase,/for\(const a of s\.operators\)if\(a\.health>0\)nearby\.push\(a\)/);
 assert.match(phase,/for\(const c of s\.civilians\)if\(c\.health>0\)nearby\.push\(c\)/);
 assert.match(phase,/isCrowded:p=>nearby\.some\(body=>body!==civil&&/);
 assert.match(phase,/const occupied=\(p:Pt,id:string\)=>nearby\.some/);
 assert.match(phase,/stepCivilianMovement\(civil,s\.seconds,h,clear,occupied,routeTo\)/);
});
