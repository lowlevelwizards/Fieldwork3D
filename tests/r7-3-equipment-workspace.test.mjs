/** R7.3 direct shared workspace acceptance, with instrumented presentation resources.
 * No WebGL or persistence is mocked as evidence of actual browser FPS or stock.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createEquipmentWorkspace} from '../src/ui/equipment-workspace.ts';
const source=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

function harness(){
 const events=[],galleries=[],previews=[],frames=new Map(),canceled=[];
 let nextFrame=1,ready=true;
 const workspace=createEquipmentWorkspace({
  createGallery:options=>{
   const gallery={options,disposed:0,dispose(){this.disposed++;events.push('gallery.dispose');},
    show(slot){events.push('gallery.show:'+slot);}};
   galleries.push(gallery);events.push('gallery.create');return gallery;
  },
  createPreview:(...args)=>{
   const preview={args,ready,disposed:0,isReady(){return this.ready;},
    setOperatorId(id){events.push('preview.id:'+id);},
    attachHost(host,draw){events.push(['preview.attach',host,draw]);},
    updateEquipment(...kit){events.push(['preview.update',...kit]);},
    setOnTapSlot(fn){events.push(['preview.tap',fn]);},
    dispose(){this.disposed++;events.push('preview.dispose');}};
   previews.push(preview);events.push('preview.create');return preview;
  },
  requestFrame:cb=>{const id=nextFrame++;frames.set(id,cb);return id;},
  cancelFrame:id=>{canceled.push(id);/* intentionally leave callback callable */},
 });
 return {workspace,events,galleries,previews,frames,canceled,
  setReady:value=>{ready=value;}};
}
function member(id='rook',weapon='carbine'){
 return {id,weapon,appearanceSeed:18,loadout:{slots:{primary:'primary-'+weapon}},
  weaponConfiguration:{id:'assembly'},magazines:[{id:'mag-1'}],wardrobe:{head:'helmet'}};
}
function options(events,who='campaign',locked=false){
 const kit=member().loadout,sources=new Map();
 return {host:{},sources,kit,magazines:[],locked,
  renderModel:(slot,id)=>{events.push([who,'thumbnail',slot,id]);return 'data:image/mock';},
  onEquip:(slot,id)=>events.push([who,'equip',slot,id]),
  onInspect:(slot,id)=>events.push([who,'inspect',slot,id]),
  onSelectCategory:slot=>events.push([who,'select',slot]),
  onArsenal:()=>events.push([who,'arsenal']),
  onAutoPack:()=>events.push([who,'pack']),
  onAdvanced:()=>events.push([who,'carry'])};
}
test('R7.3 one gallery; every replacement retires old generation before construction',()=>{
 const h=harness(),w=h.workspace,first=options(h.events);
 const a=w.mountGallery('rook',first);
 assert.equal(a.options.kit,first.kit);
 assert.equal(a.options.sources,first.sources);
 assert.equal(a.options.locked,false);
 a.options.onEquip('primary','primary-rifle');
 const second=options(h.events,'quick',true);
 const b=w.mountGallery('rook',second);
 assert.equal(a.disposed,1);
 assert.deepEqual(h.events.slice(-2),['gallery.dispose','gallery.create']);
 assert.equal(b.options.locked,true,'caller owns unavailable state');
 assert.equal(b.options.sources,second.sources);
 const n=h.events.length;
 a.options.onEquip('rig','illegal-stale');
 a.options.onInspect('rig','old');
 a.options.onSelectCategory('head');
 a.options.onArsenal();a.options.onAutoPack();a.options.onAdvanced();
 assert.equal(a.options.renderModel('rig','old'),null);
 assert.equal(h.events.length,n,'retired gallery cannot dispatch any action or thumbnail');
 b.options.onEquip('belt','test'); // only delegates; actual caller checks its own authority.
 assert.deepEqual(h.events.at(-1),['quick','equip','belt','test']);
 w.dispose();w.dispose();assert.equal(b.disposed,1);
});
test('R7.3 same preview renderer reattaches and updates authoritative committed equipment',()=>{
 const h=harness(),w=h.workspace,a=member(),hostA={},hostB={},b=member('moss','rifle');
 const preview=w.mountPreview(hostA,a,'carry',1.25);
 assert.deepEqual(preview.args,[hostA,a.id,a.weapon,a.appearanceSeed,a.loadout,
  a.weaponConfiguration,a.magazines,a.wardrobe,'carry',1.25]);
 w.beginRender();
 assert.equal(w.mountPreview(hostB,b,'head',.5),preview);
 assert.equal(h.previews.length,1);
 assert.deepEqual(h.events.slice(-3),['preview.id:moss',['preview.attach',hostB,false],
  ['preview.update',b.weapon,b.appearanceSeed,b.loadout,b.weaponConfiguration,b.magazines,b.wardrobe]]);
 assert.equal(preview.disposed,0);
 w.releasePreview();w.releasePreview();
 assert.equal(preview.disposed,1);assert.equal(w.preview,null);
 assert.deepEqual(h.events.slice(-2),[['preview.tap',null],'preview.dispose']);
});
test('R7.3 mode-local operator memory survives rerenders but cannot cross workspace instances',()=>{
 const h=harness(),w=h.workspace,another=harness().workspace;
 const a=w.memoryFor('rook');
 a.selectedItems.set('head','helmet');a.scrollPositions.set('head',142);
 w.mountGallery('rook',options(h.events));
 assert.equal(h.galleries[0].options.selectedItems,a.selectedItems);
 w.beginRender();w.mountGallery('rook',options(h.events));
 assert.equal(h.galleries[1].options.scrollPositions.get('head'),142);
 assert.equal(w.memoryFor('moss').selectedItems.size,0);
 assert.equal(another.memoryFor('rook').selectedItems.size,0);
 assert.equal(another.memoryFor('rook').scrollPositions.size,0);
});
test('R7.3 deferred mount never reopens a hidden, replaced or disposed board',()=>{
 const h=harness(),w=h.workspace;
 let visible=true,mounts=0;
 const mount=()=>{mounts++;w.mountPreview({},member());};
 w.deferPreviewMount(()=>visible,mount);
 w.beginRender();assert.deepEqual(h.canceled,[1]);
 h.frames.get(1)(0);assert.equal(mounts,0,'late canceled frame after replacement');
 w.deferPreviewMount(()=>visible,mount);visible=false;
 h.frames.get(2)(0);assert.equal(mounts,0,'hidden or detached mount');
 visible=true;w.deferPreviewMount(()=>visible,mount);
 h.frames.get(3)(0);assert.equal(mounts,1);
 w.deferPreviewMount(()=>visible,mount);w.dispose();
 assert.ok(h.canceled.includes(4));
 h.frames.get(4)(0);assert.equal(mounts,1,'late canceled frame after close');
 assert.equal(h.previews[0].disposed,1);
 assert.equal(w.preview,null);
});
test('R7.3 unavailable renderer keeps editing independent and retries only on a new mount',()=>{
 const h=harness(),w=h.workspace;h.setReady(false);
 const old=w.mountPreview({},member());
 assert.equal(old.isReady(),false);
 const gallery=w.mountGallery('rook',options(h.events));
 gallery.options.onEquip('head','helmet');
 assert.deepEqual(h.events.at(-1),['campaign','equip','head','helmet']);
 h.setReady(true);
 const next=w.mountPreview({},member());
 assert.notEqual(old,next);assert.equal(old.disposed,1);assert.equal(next.isReady(),true);
 w.dispose();
 assert.equal(next.disposed,1);assert.equal(gallery.disposed,1);
});
test('R7.3 all three actual view adapters retain their own committed kit and transaction paths',()=>{
 const campaign=source('campaign-ui.ts'),board=source('breach-operations-board-controller.ts');
 const creator=source('ui/quick-play-configurator.ts'),main=source('breach-main.ts');
 const workspace=source('ui/equipment-workspace.ts');
 for(const s of [campaign,board,creator]){
  assert.match(s,/createEquipmentWorkspace\(\)/);
  assert.match(s,/equipmentWorkspace\.mountGallery\(/);
  assert.match(s,/equipmentWorkspace\.mountPreview\(/);
  assert.doesNotMatch(s,/new CampaignKitPreview\(/);
  assert.doesNotMatch(s,/createOutfitterGallery\(/);
 }
 assert.match(campaign,/this\.handlers\.equipCarryGear\(id,carrySlot,itemId\)/);
 assert.match(campaign,/quoteCarryGearChange\(person\.loadout,person\.magazines/);
 assert.match(campaign,/this\.carryUndo\.record\(id,/);
 assert.match(campaign,/original\.dispatchEvent\(new Event\('change',\{bubbles:true\}\)\)/);
 assert.match(board,/equipRosterCarryGear\(before,member\.id,slot,itemId\)/);
 assert.match(board,/config\.setRoster\(after\);config\.saveRoster\(\);config\.applyRoster\(\)/);
 assert.match(creator,/options\.onEquipCarryGear\?\.\(selected\.id,slot,itemId\)/);
 assert.match(creator,/options\.onEquipGear\?\.\(selected\.id,slot,itemId\)/);
 assert.match(board,/equipmentWorkspace\.deferPreviewMount\(\s*\(\)=>kit\.isConnected&&card\.open&&kit\.open/);
 assert.match(board,/if\(config\.board\.hidden\)\{dispose\(\);return;\}/);
 assert.match(board,/syncVisibility\(\):void\{if\(config\.board\.hidden\)dispose\(\);\}/);
 assert.match(main,/operationsBoardController\.syncVisibility\(\)/);
 assert.match(creator,/disposeSquadPreview=\(\)=>equipmentWorkspace\.dispose\(\)/);
 for(const forbidden of ['equipCampaignCarryGear','equipRosterCarryGear','saveRoster','saveCampaign','localStorage','stepSession'])
  assert.ok(!workspace.includes(forbidden),forbidden);
});
