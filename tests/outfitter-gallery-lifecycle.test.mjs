import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

test('gallery owns and releases IntersectionObserver and all queued frames',()=>{
 const gallery=read('ui/campaign-outfitter-gallery.ts');
 assert.match(gallery,/const dispose=\(\)=>\{/);
 assert.match(gallery,/observer\?\.disconnect\(\);\s*thumbTargets\.clear\(\);queued\.length=0;/);
 assert.match(gallery,/if\(thumbnailFrame\)cancelAnimationFrame\(thumbnailFrame\)/);
 assert.match(gallery,/if\(scrollFrame\)cancelAnimationFrame\(scrollFrame\)/);
 assert.match(gallery,/disposed=true;\s*thumbnailGeneration\+\+/);
 assert.match(gallery,/generation!==thumbnailGeneration/);
 assert.match(gallery,/if\(disposed\|\|thumbnailBusy\)return/);
 assert.match(gallery,/return \{root,show,getActive:\(\)=>active,dispose\}/);
 assert.match(gallery,/if\(disposed\)return;[\s\S]*?if\(renderedSlot===slot\)return;\s*renderedSlot=slot;\s*active=slot/);
});

test('all three outfitter entry points retire replaced galleries through the shared workspace',()=>{
 const campaign=read('campaign-ui.ts');
 const quick=read('ui/quick-play-configurator.ts');
 const board=read('breach-operations-board-controller.ts');
 const owner=read('ui/equipment-workspace.ts');
 assert.match(campaign,/private disposeGallery\(\)\{\s*this\.equipmentWorkspace\.beginRender\(\)/);
 assert.match(campaign,/this\.equipmentWorkspace\.mountGallery\(id,\{/);
 assert.match(campaign,/hide\(\)\{this\.disposeGallery\(\)/);
 assert.match(quick,/disposeSquadPreview=\(\)=>equipmentWorkspace\.dispose\(\)/);
 assert.match(quick,/equipmentWorkspace\.beginRender\(\)/);
 assert.match(quick,/equipmentWorkspace\.mountGallery\(selected\.id,\{/);
 assert.match(board,/function renderOperationsBoard\(\)\{\s*equipmentWorkspace\.beginRender\(\)/);
 assert.match(board,/equipmentWorkspace\.mountGallery\(member\.id,\{/);
 assert.match(board,/equipmentWorkspace\.dispose\(\)/);
 assert.match(owner,/function retireGallery\(\):void\{\s*galleryGeneration\+\+/);
 assert.match(owner,/const previous=gallery;gallery=null;previous\?\.dispose\(\)/);
 assert.match(owner,/function mountGallery[\s\S]*?retireGallery\(\);[\s\S]*?gallery=createGallery\(/);
});
