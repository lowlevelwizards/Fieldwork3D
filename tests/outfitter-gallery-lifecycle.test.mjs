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

test('all three outfitter entry points dispose replaced galleries',()=>{
 const campaign=read('campaign-ui.ts');
 assert.match(campaign,/private disposeGallery\(\)\{/);
 assert.match(campaign,/this\.outfitterGallery\?\.dispose\(\)/);
 assert.match(campaign,/this\.outfitterGallery=gallery/);
 assert.match(campaign,/hide\(\)\{this\.disposeGallery\(\)/);
 const quick=read('ui/quick-play-configurator.ts');
 assert.match(quick,/squadGallery\?\.dispose\(\);squadGallery=null/);
 assert.match(quick,/squadGallery=gallery/);
 const board=read('breach-operations-board-controller.ts');
 assert.match(board,/function renderOperationsBoard\(\)\{\s*currentGallery\?\.dispose\(\)/);
 assert.match(board,/currentGallery=gallery/);
});
