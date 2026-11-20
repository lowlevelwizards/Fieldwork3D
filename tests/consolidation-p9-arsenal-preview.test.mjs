import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArsenalPreviewQueue} from '../src/arsenal/preview-job-queue.ts';
const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

test('P9: one RAF serializes cards, prioritizes hero, and replaces obsolete host jobs',()=>{
 const originalRaf=globalThis.requestAnimationFrame;
 const originalCancel=globalThis.cancelAnimationFrame;
 const callbacks=new Map();let nextId=1;
 globalThis.requestAnimationFrame=fn=>{const id=nextId++;callbacks.set(id,fn);return id;};
 globalThis.cancelAnimationFrame=id=>{callbacks.delete(id);};
 const step=()=>{
  const entry=callbacks.entries().next().value;
  assert.ok(entry,'expected a queued frame');
  callbacks.delete(entry[0]);entry[1]();
 };
 try{
  const queue=createArsenalPreviewQueue();
  const a={isConnected:true},b={isConnected:true};
  const drawn=[];
  queue.enqueue(a,()=>drawn.push('stale'));
  queue.enqueue(a,()=>drawn.push('latest'));
  queue.enqueue(b,()=>drawn.push('hero'),true);
  assert.equal(callbacks.size,1,'single RAF despite three enqueues');
  step();assert.deepEqual(drawn,['hero']);
  step();assert.deepEqual(drawn,['hero','latest']);
  assert.equal(callbacks.size,0);
  queue.enqueue(a,()=>drawn.push('detached'));
  a.isConnected=false;queue.pruneDetached();step();
  assert.deepEqual(drawn,['hero','latest']);
  queue.enqueue(b,()=>drawn.push('disposed'));
  assert.equal(callbacks.size,1);
  queue.dispose();
  assert.equal(callbacks.size,0,'pending RAF cancelled');
  queue.enqueue(b,()=>drawn.push('ignored'));
  assert.equal(callbacks.size,0);
  queue.dispose();
 }finally{
  globalThis.requestAnimationFrame=originalRaf;
  globalThis.cancelAnimationFrame=originalCancel;
 }
});

test('P9: secondary is activated by tab, renders only visible queued cards, and retires observers',()=>{
 const main=src('arsenal/gallery-main.ts');
 const glock=src('arsenal/glock-gallery.ts');
 const queue=src('arsenal/preview-job-queue.ts');
 assert.match(main,/const secondaryGallery=mountGlockArsenalGallery\(\)/);
 assert.match(main,/if\(secondary\)secondaryGallery\.activate\(\)/);
 assert.match(main,/const previewQueue=createArsenalPreviewQueue\(\)/);
 assert.match(main,/previewQueue\.enqueue\(host,task,hero\)/);
 assert.match(glock,/const previewQueue=createArsenalPreviewQueue\(\)/);
 assert.match(glock,/previewQueue\.enqueue\(feature,\(\)=>\s*display\(feature,selected,'hero',saved\?\.recipe\.customization\),true\)/);
 assert.match(glock,/const activate=\(\)=>\{\s*if\(activated\)return;\s*activated=true;\s*renderFilters\(\);renderCards\(\)/);
 assert.match(glock,/if\('IntersectionObserver' in window\)/);
 assert.match(glock,/deferred\.set\(image,paint\);observer\.observe\(image\)/);
 assert.match(glock,/previewQueue\.enqueue\(entry\.target as HTMLElement,render\)/);
 assert.match(glock,/previewQueue\.pruneDetached\(\)/);
 assert.match(glock,/observer\?\.disconnect\(\);previewQueue\.dispose\(\);renderer\.dispose\(\)/);
 assert.match(glock,/renderer\.render\(ref\.id,'card',/);
 assert.match(glock,/choice\.kind==='saved'\?choice\.build\.recipe\.customization:undefined/);
 assert.doesNotMatch(glock,/renderFilters\(\);renderCards\(\);\s*\/\/ One shared WebGL context/);
 assert.doesNotMatch(queue,/THREE|localStorage|equipRoster|ammunition|setRoster/);
});
