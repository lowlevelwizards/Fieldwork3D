import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const source=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
const preview=source('equipment-preview.ts');
const gallery=source('ui/campaign-outfitter-gallery.ts');

test('P3.B leaves synchronous carry thumbnail API intact',()=>{
 const signature=preview.slice(preview.indexOf(' renderModelThumbnail('),
  preview.indexOf(' async renderModelThumbnailAsync('));
 assert.match(signature, /:string\|null\{/);
 assert.match(signature,/captureModelThumbnail\(target,false\)/);
 assert.match(preview,/this\.renderer\.readRenderTargetPixels\(targetBuffer,0,0,/);
 assert.match(preview,/new URLSearchParams\(window\.location\.search\)\.get\('thumbnailReadback'\)!=='sync'/);
});

test('P3.B reserves an exclusive readback slot before yielding',()=>{
 const start=preview.indexOf(' async renderModelThumbnailAsync(');
 const end=preview.indexOf(' private captureModelThumbnail(',start);
 const section=preview.slice(start,end);
 assert.match(preview,/private thumbnailReadbackTail:Promise<void>=Promise\.resolve\(\)/);
 const reserve=section.indexOf('this.thumbnailReadbackTail=new Promise<void>');
 const awaitPrevious=section.indexOf('await previous');
 assert.ok(reserve>=0&&awaitPrevious>reserve,
  'reserve queue slot before awaiting the previous capture');
 assert.match(section,/try\{[\s\S]*?return await this\.captureModelThumbnail\(target,true\)/);
 assert.match(section,/finally\{release\(\);\}/);
});

test('P3.B async GPU target and pixel buffer are dedicated and bounded',()=>{
 assert.match(preview,/private thumbnailAsyncTarget:THREE\.WebGLRenderTarget\|null=null/);
 assert.match(preview,/private thumbnailAsyncPixels:Uint8Array\|null=null/);
 assert.match(preview,/const asyncReadback=asynchronous&&/);
 assert.match(preview,/asyncReadback\?this\.thumbnailAsyncTarget:this\.thumbnailTarget/);
 assert.match(preview,/asyncReadback\?this\.thumbnailAsyncPixels:this\.thumbnailPixels/);
 assert.match(preview,/this\.renderer\.readRenderTargetPixelsAsync\(targetBuffer/);
 assert.match(preview,/this\.renderer\.setRenderTarget\(previousTarget\)/);
 const capture=preview.slice(preview.indexOf(' private captureModelThumbnail('),
  preview.indexOf(' private previewGearMesh('));
 const restore=capture.indexOf('this.renderer.setRenderTarget(previousTarget)');
 const resolve=capture.indexOf('return pending.then(');
 assert.ok(restore>=0&&resolve>restore,
  'restore main framebuffer before awaiting GPU result');
 assert.match(preview,/this\.thumbnailAsyncTarget\?\.dispose\(\)/);
 assert.match(preview,/this\.thumbnailAsyncPixels=null/);
});

test('P3.B invalidates late GPU work on kit swaps or preview disposal',()=>{
 assert.match(preview,/this\.thumbnailRevision\+\+;\s*this\.modelThumbCache\.clear\(\)/);
 assert.match(preview,/revision!==this\.thumbnailRevision/);
 assert.match(preview,/if\(!this\.renderer\|\|revision!==this\.thumbnailRevision\)return null/);
 assert.match(preview,/this\.thumbnailRevision\+\+;\s*this\.thumbnailTarget\?\.dispose/);
});

test('P3.B gallery waits once and ignores obsolete operator/category work',()=>{
 assert.match(gallery,/renderModel:\(slot:LoadoutSlot,itemId:string\)=>string\|null\|Promise<string\|null>/);
 assert.match(gallery,/let thumbnailBusy=false/);
 assert.match(gallery,/if\(thumbnailBusy\)return/);
 assert.match(gallery,/const url=await options\.renderModel\(slot,choice\.id\)/);
 assert.match(gallery,/generation!==thumbnailGeneration\|\|!root\.isConnected\|\|!tile\.isConnected/);
 assert.match(gallery,/root\.dataset\.slot!==slot/);
 assert.match(gallery,/thumbnailGeneration\+\+;\s*observer\?\.disconnect\(\);queued\.length=0/);
 assert.match(gallery,/thumbnailBusy=false;\s*if\(queued\.length&&root\.isConnected/);
 assert.match(gallery,/tile\.disabled=!choice\.issued/);
});

test('P3.B all three production outfitters use async thumbnails, other consumers remain sync',()=>{
 for(const name of ['campaign-ui.ts','ui/quick-play-configurator.ts',
  'breach-operations-board-controller.ts']){
  const code=source(name);
  assert.match(code,/renderModel:\(slot,itemId\)=>[\w.?]+renderModelThumbnailAsync\(/,
   name+' should use async gallery provider');
 }
 assert.match(source('ui/quick-play-configurator.ts'),/createOutfitterGallery\(/);
});
