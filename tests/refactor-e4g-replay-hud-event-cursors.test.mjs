import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayEventIndex} from '../src/breach-replay-event-index.ts';

/** Independent pre-E4.G upper and lower bounds on the index's historical
 * sorted/filtered arrays, with the exact original operators and tie behavior. */
function originalLatest(index,time){
 const items=index.all;let lo=0,hi=items.length;
 while(lo<hi){const mid=(lo+hi)>>>1;
  if(items[mid].t<=time)lo=mid+1;else hi=mid;
 }
 return items[lo-1]??null;
}
function originalNext(index,time,tolerance=.15){
 const items=index.navigation,target=time+tolerance;let lo=0,hi=items.length;
 while(lo<hi){const mid=(lo+hi)>>>1;
  if(items[mid].t<=target)lo=mid+1;else hi=mid;
 }
 return items[lo]??null;
}
function originalPrevious(index,time,tolerance=.15){
 const items=index.navigation,target=time-tolerance;let lo=0,hi=items.length;
 while(lo<hi){const mid=(lo+hi)>>>1;
  if(items[mid].t<target)lo=mid+1;else hi=mid;
 }
 return items[lo-1]??null;
}
const battle=n=>Array.from({length:n},(_,i)=>({
 id:i+1,t:i*.05,kind:i%7===0?'shot':i%5===0?'wound':'door',
 actor:i%3===0?'rook':'guard0',text:'B'+i
}));
const execution=n=>Array.from({length:n},(_,i)=>({
 id:100000+i,t:i*.15,kind:i%3===0?'blocked':i%3===1?'resumed':'completed',
 actor:i%2===0?'rook':'moss',text:'E'+i
}));
function assertParity(index){
 const times=[-Infinity,-12,-.2,0,.05,.15,.25,.5,1,10,35,80,
   Infinity,NaN,5,20,3,70,0,2.2,5.1];
 for(let i=0;i<200;i++)times.push(i%17===0?80-i*.37:
  i%5===0?i*.042:30+i/60);
 for(const time of times){
  assert.strictEqual(index.latest(time),originalLatest(index,time),
   'latest at '+time);
  for(const tolerance of [undefined,0,.15,1,-.15,Infinity,-Infinity,NaN]){
   assert.strictEqual(index.next(time,tolerance),originalNext(index,time,tolerance),
    'next at '+time+' tolerance '+tolerance);
   assert.strictEqual(index.previous(time,tolerance),
    originalPrevious(index,time,tolerance),
    'previous at '+time+' tolerance '+tolerance);
  }
 }
}
test('E4.G chronological mixed-event navigation matches original indexes',()=>{
 assertParity(new ReplayEventIndex(battle(1350),execution(420)));
});
test('E4.G historical filtering, dense same-time ties and events with no navigation',()=>{
 const b=battle(600);
 for(let i=80;i<190;i++)b[i].t=4.05;
 const e=execution(300);
 for(let i=20;i<110;i++)e[i].t=3.0;
 assertParity(new ReplayEventIndex(b,e,x=>x.actor==='rook'));
 assertParity(new ReplayEventIndex(b,e,x=>x.kind==='shot'));
 assertParity(new ReplayEventIndex(b,e,()=>false));
 assertParity(new ReplayEventIndex([],[]));
});
test('E4.G legacy nonfinite and out-of-order event evidence keeps exact binary parity',()=>{
 const b=battle(640),e=execution(220);
 b[50].t=NaN;b[100].t=Infinity;b[250].t=-Infinity;
 e[14].t=NaN;e[42].t=Infinity;e[125].t=-Infinity;
 // Do not normalize, reorder or discard the legacy timestamps.
 assertParity(new ReplayEventIndex(b,e));
 assertParity(new ReplayEventIndex(b,e,x=>x.source==='battle'));
});
test('E4.G two same-ID indexes have independent seek positions',()=>{
 const a=new ReplayEventIndex(battle(850),execution(100));
 const b=battle(850);for(const item of b)item.t+=.021;
 const other=new ReplayEventIndex(b,execution(150));
 for(const t of [15,2,10,0,37,Infinity,NaN,9,39,5,12]){
  assert.strictEqual(a.latest(t),originalLatest(a,t));
  assert.strictEqual(other.latest(t),originalLatest(other,t));
  assert.strictEqual(a.next(t),originalNext(a,t));
  assert.strictEqual(other.previous(t),originalPrevious(other,t));
 }
});
test('E4.G 120 nearby HUD refreshes inspect a bounded number of event timestamps',()=>{
 const index=new ReplayEventIndex(battle(2400),execution(600));
 let reads=0;
 for(const item of index.all){
  const t=item.t;
  Object.defineProperty(item,'t',{configurable:true,
   get(){reads++;return t;}});
 }
 index.latest(55.14);index.previous(55);index.next(55);
 reads=0;
 for(let i=1;i<=120;i++){
  const time=55+i/60;
  index.previous(time);
  index.next(time);
  index.latest(time+.14);
 }
 assert.ok(reads<120*25,
  'adjacent HUD queries must seek locally, measured timestamp reads '+reads);
 for(const time of [0,3,40,2,70,20,NaN,Infinity]){
  assert.strictEqual(index.latest(time),originalLatest(index,time));
  assert.strictEqual(index.next(time),originalNext(index,time));
  assert.strictEqual(index.previous(time),originalPrevious(index,time));
 }
});
