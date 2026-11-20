import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const src=(name)=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');

test('mobile inspection draws its real selected dot but skips hidden 3D hotspot bounds',()=>{
 const code=src('equipment-preview.ts');
 const method=code.slice(code.indexOf(' private syncHotspots():void{'),
  code.indexOf(' private tapEquipmentAt('));
 assert.ok(method.startsWith(' private syncHotspots():void{'));
 const phone=method.indexOf('if(this.host.clientWidth<=620)');
 const deep=method.indexOf('this.rig.root.updateWorldMatrix(true,true)');
 assert.ok(phone>=0&&phone<deep,'phone path must branch before rig traversal');
 assert.match(method.slice(phone,deep),/this\.syncSelectionDot\(\)/);
 assert.match(method.slice(phone,deep),/this\.hotspotButtons\.values\(\)/);
 assert.match(method.slice(phone,deep),/return;/);
 assert.match(method.slice(deep),/new THREE\.Box3\(\)\.setFromObject/);
});

test('equipment thumbnail capture reuses one GPU target and restores live framebuffer',()=>{
 const code=src('equipment-preview.ts');
 const capture=code.slice(code.indexOf(' renderModelThumbnail('),
  code.indexOf(' private previewGearMesh('));
 assert.match(code,/private thumbnailTarget:THREE\.WebGLRenderTarget\|null=null/);
 assert.match(capture,/let targetBuffer=asyncReadback\?this\.thumbnailAsyncTarget:this\.thumbnailTarget/);
 assert.match(capture,/else this\.thumbnailTarget=targetBuffer/);
 assert.match(capture,/targetBuffer\.setSize\(shot\.width,shot\.height\)/);
 assert.match(capture,/if\(!pixels\|\|pixels\.length!==byteLength\)pixels=new Uint8Array/);
 assert.match(capture,/if\(!this\.thumbnailCanvas\)/);
 assert.match(capture,/finally\{[\s\S]*?this\.renderer\.setRenderTarget\(previousTarget\)/);
 assert.doesNotMatch(capture,/targetBuffer\.dispose\(\)/);
 assert.match(code,/this\.thumbnailTarget\?\.dispose\(\)/);
 assert.match(code,/this\.thumbnailCanvas=null/);
});

test('arsenal defers 3D thumbnails, replaces stale host jobs and prioritizes hero',()=>{
 const code=src('arsenal/gallery-main.ts');
 assert.match(code,/const previewVersions=new WeakMap<HTMLElement,number>\(\)/);
 assert.match(code,/if\(previewQueue\[i\]\.host===host\)previewQueue\.splice\(i,1\)/);
 assert.match(code,/host\.isConnected&&previewVersions\.get\(host\)===version/);
 assert.match(code,/if\(hero\)previewQueue\.unshift\(job\)/);
 assert.match(code,/if\(!previewQueue\[i\]\.host\.isConnected\)previewQueue\.splice\(i,1\)/);
 assert.match(code,/\},size==='hero'\)/);
});

test('secondary inspector coalesces pointer renders and only resizes on change',()=>{
 const code=src('arsenal/glock-viewport.ts');
 assert.match(code,/if\(width!==this\.renderedWidth\|\|height!==this\.renderedHeight\)/);
 assert.match(code,/if\(this\.disposed\|\|this\.frameId!==null\)return/);
 assert.match(code,/this\.frameId=requestAnimationFrame/);
 assert.match(code,/if\(this\.frameId!==null\)cancelAnimationFrame\(this\.frameId\)/);
 assert.match(code,/this\.frameId=null;this\.observer\.disconnect\(\)/);
});
