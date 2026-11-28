import test from 'node:test';
import assert from 'node:assert/strict';
import {createArsenalPreviewQueue} from '../src/arsenal/preview-job-queue.ts';
function withFrames(fn){
 const oldRaf=globalThis.requestAnimationFrame,oldCancel=globalThis.cancelAnimationFrame;
 const frames=new Map();let id=0;
 globalThis.requestAnimationFrame=callback=>{frames.set(++id,callback);return id;};
 globalThis.cancelAnimationFrame=n=>frames.delete(n);
 const step=()=>{const [n,cb]=frames.entries().next().value;frames.delete(n);cb();};
 try{fn(frames,step);}finally{globalThis.requestAnimationFrame=oldRaf;globalThis.cancelAnimationFrame=oldCancel;}
}
test('hidden gallery pauses jobs and resumes latest hero first; late canceled RAF is inert',()=>withFrames((frames,step)=>{
 const q=createArsenalPreviewQueue(),card={isConnected:true},hero={isConnected:true},seen=[];
 q.enqueue(card,()=>seen.push('card'));const stale=[...frames.values()][0];q.setPaused(true);
 q.enqueue(hero,()=>seen.push('old'),true);q.enqueue(hero,()=>seen.push('hero'),true);
 assert.equal(frames.size,0);q.setPaused(false);assert.equal(frames.size,1);stale();assert.deepEqual(seen,[]);
 step();assert.deepEqual(seen,['hero']);step();assert.deepEqual(seen,['hero','card']);assert.equal(frames.size,0);
}));
test('resume prunes detached hosts; disposed queue ignores late frames and new jobs',()=>withFrames((frames,step)=>{
 const q=createArsenalPreviewQueue(),a={isConnected:true},b={isConnected:true};let count=0;
 q.setPaused(true);q.enqueue(a,()=>count++);q.enqueue(b,()=>count++);a.isConnected=false;
 q.setPaused(false);step();assert.equal(count,1);assert.equal(frames.size,0);
 q.enqueue(b,()=>count++);const stale=[...frames.values()][0];q.dispose();q.dispose();stale();q.enqueue(b,()=>count++);q.setPaused(false);
 assert.equal(count,1);assert.equal(frames.size,0);
}));
test('reentrant enqueues never create two scheduled frames',()=>withFrames((frames,step)=>{
 const q=createArsenalPreviewQueue(),a={isConnected:true},b={isConnected:true};let count=0;
 q.enqueue(a,()=>{count++;q.enqueue(b,()=>count++);});step();assert.equal(frames.size,1);step();assert.equal(count,2);assert.equal(frames.size,0);
}));
