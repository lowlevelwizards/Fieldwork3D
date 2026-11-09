/** Focused allocation-oriented host benchmark (not FPS).
 * Compares the same pre-motion snapshot and resolver input shapes before
 * any motor updates, on a fixed roster with both teams and civilians.
 */
import {performance} from 'node:perf_hooks';
import {captureMotionFrameOrigins,buildMotionFrameProposals}
  from '../src/breach-motion-frame-input.ts';

const operators=Array.from({length:20},(_,i)=>({
 id:'operator-'+i,side:i<4?'blue':'red',
 health:i%9===0?0:4,carriedById:null,
 p:{x:200+i*13,y:140+(i%7)*17}
}));
const civilians=Array.from({length:12},(_,i)=>({
 id:'civil-'+i,health:i%7===0?0:1,carriedById:null,
 p:{x:330+i*7,y:210+(i%5)*19}
}));
function original(){
 const origins=new Map([...operators,...civilians].map(a=>[
   a.id,{x:a.p.x,y:a.p.y}
 ]));
 const proposals=[
  ...operators.map(a=>({id:a.id,side:a.side,
    from:origins.get(a.id)??a.p,to:a.p,alive:a.health>0,
    carried:!!a.carriedById})),
  ...civilians.map(c=>({id:c.id,side:'neutral',
    from:origins.get(c.id)??c.p,to:c.p,
    alive:c.health>0||!!c.carriedById,carried:!!c.carriedById}))
 ];
 return proposals;
}
function improved(){
 const origins=captureMotionFrameOrigins(operators,civilians);
 return buildMotionFrameProposals(operators,civilians,origins);
}
const a=original(),b=improved();
if(JSON.stringify(a)!==JSON.stringify(b))
 throw Error('Movement authority proposal parity lost');
function time(fn){
 let count=0;
 for(let i=0;i<300;i++)count+=fn().length;
 const start=performance.now();
 for(let i=0;i<2000;i++)count+=fn().length;
 return {elapsedMs:+(performance.now()-start).toFixed(2),proposals:count};
}
const before=time(original),after=time(improved);
if(before.proposals!==after.proposals)throw Error('Count mismatch');
console.log(JSON.stringify({operatorCount:operators.length,
 civilianCount:civilians.length,iterations:2000,
 legacyMs:before.elapsedMs,newMs:after.elapsedMs,parity:true,
 note:'Node CPU allocations only; not device FPS'},null,2));
