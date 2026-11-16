import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplayMovementHistory} from '../src/breach-replay-movement-history.ts';

/** Independent pre-E4.F constructor and two binary searches.
 * Neither the new cursor helper nor its boundary predicate is called. */
function originalTracks(frames,ids){
 const wanted=new Set(ids),tracks=new Map();
 for(const frame of frames)for(const actor of frame.actors){
  if(!wanted.has(actor.id))continue;
  let points=tracks.get(actor.id);
  if(!points){points=[];tracks.set(actor.id,points);}
  const last=points.at(-1);
  if(last&&Math.hypot(actor.p.x-last.p.x,actor.p.y-last.p.y)<3&&
     frame.t-last.t<.5)continue;
  points.push({t:frame.t,p:{x:actor.p.x,y:actor.p.y},
   pace:actor.pace,posture:actor.posture});
 }
 return tracks;
}
function originalSegment(all,time,seconds,maxPoints=400){
 if(!all.length||time<all[0].t)return [];
 const before=Number.isFinite(seconds)?Math.max(0,time-seconds):0;
 let lo=0,hi=all.length;
 while(lo<hi){const mid=(lo+hi)>>>1;
  if(all[mid].t<before)lo=mid+1;else hi=mid;
 }
 const start=Math.max(0,lo-1);
 lo=0;hi=all.length;
 while(lo<hi){const mid=(lo+hi)>>>1;
  if(all[mid].t<=time)lo=mid+1;else hi=mid;
 }
 const end=lo;
 if(end<=start)return [];
 const count=end-start;
 const step=Math.max(1,Math.ceil(count/Math.max(2,maxPoints)));
 const out=[];
 for(let i=start;i<end;i+=step)out.push(all[i]);
 if(out.at(-1)!==all[end-1])out.push(all[end-1]);
 return out;
}
const makeFrames=(n,offset=0)=>Array.from({length:n},(_,i)=>({
 t:i*.05+offset,
 actors:[
  {id:'rook',p:{x:100+i*4,y:50+(i%2)*5},pace:i%2?'run':'walk',posture:'stand'},
  {id:'moss',p:{x:200+i*5,y:80+(i%3)*6},pace:'walk',
   posture:i%4?'stand':'crouch'}
 ]
}));
function checkHistoryParity(frames,ids){
 const history=new ReplayMovementHistory(frames,ids);
 const original=originalTracks(frames,ids);
 const times=[-Infinity,-1,-.01,0,.01,.05,.1,.15,.2,1,10,40,
   60,99,Infinity,NaN,120,1,50,49.99,.04,77,-4];
 for(let i=0;i<160;i++)times.push(i%17===0?90-i*.13:
   i%11===0?i*.041:30+i/60);
 for(const id of [...ids,'absent']){
  for(const time of times)for(const seconds of
    [Infinity,15,.4,0,25,-.2,NaN,-Infinity]){
   for(const cap of [2,19,350]){
    assert.deepEqual(history.segment(id,time,seconds,cap),
     originalSegment(original.get(id)??[],time,seconds,cap),
     'E4.F changed '+id+' at '+time+' window '+seconds+' cap '+cap);
   }
  }
 }
 assert.deepEqual(originalTracks(frames,ids),original,
  'queries must not modify recorded movement evidence');
}
test('E4.F long chronological trails preserve exact prior two-search windows',()=>{
 checkHistoryParity(makeFrames(1250),['rook','moss']);
});
test('E4.F unordered, duplicate and nonfinite legacy trail dates retain original search',()=>{
 const frames=makeFrames(510);
 frames[40].t=frames[39].t;
 frames[160].t=-4;
 frames[200].t=NaN;
 frames[275].t=Infinity;
 frames[325].t=-Infinity;
 checkHistoryParity(frames,['rook','moss']);
});
test('E4.F independent same-ID histories do not share window state',()=>{
 const first=makeFrames(920),second=makeFrames(920,.023);
 const a=new ReplayMovementHistory(first,['rook']);
 const b=new ReplayMovementHistory(second,['rook']);
 const ai=originalTracks(first,['rook']).get('rook');
 const bi=originalTracks(second,['rook']).get('rook');
 for(const time of [10,11,12,5,70,0,13,13.02,Infinity,NaN,30,3]){
  for(const span of [Infinity,15,0,.5]){
   assert.deepEqual(a.segment('rook',time,span,25),
    originalSegment(ai,time,span,25));
   assert.deepEqual(b.segment('rook',time,span,25),
    originalSegment(bi,time,span,25));
  }
 }
});
test('E4.F adjacent 60Hz trail frames use bounded timestamp reads',()=>{
 const history=new ReplayMovementHistory(makeFrames(2500),['rook']);
 const points=history.segment('rook',Infinity,Infinity,3000);
 assert.equal(points.length,2500);
 let reads=0;
 for(const point of points){
  const t=point.t;
  Object.defineProperty(point,'t',{configurable:true,
   get(){reads++;return t;}});
 }
 history.segment('rook',50,15,20);
 reads=0;
 for(let i=1;i<=120;i++)
  history.segment('rook',50+i/60,15,20);
 assert.ok(reads<120*15,
  'nearby bounds must examine a fixed-size neighborhood, read '+reads);
 for(const time of [0,3,50,2,70,20,NaN,Infinity]){
  assert.deepEqual(history.segment('rook',time,15,20),
   originalSegment(points,time,15,20));
 }
});
test('E4.F collapsed times, empty tracks and rendering cap edge cases preserve output',()=>{
 const frames=makeFrames(120);
 for(let i=10;i<80;i++)frames[i].t=.5;
 const history=new ReplayMovementHistory(frames,['rook']);
 const baseline=originalTracks(frames,['rook']).get('rook');
 for(const t of [-Infinity,0,.5,.51,2,Infinity,NaN]){
  for(const cap of [0,1,2,NaN,1000]){
   for(const span of [0,.1,Infinity,-1]){
    assert.deepEqual(history.segment('rook',t,span,cap),
     originalSegment(baseline,t,span,cap));
   }
  }
 }
 assert.deepEqual(history.segment('untracked',.5,Infinity),[]);
});
