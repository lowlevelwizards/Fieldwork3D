import test from 'node:test';
import assert from 'node:assert/strict';
import {mountStudioShell} from '../src/studio/shell.ts';
import {createStudioOperatorEquipment} from '../src/studio/operator-equipment.ts';
import {createEquipmentWorkspace} from '../src/ui/equipment-workspace.ts';

// Minimal instrumented DOM port: lifecycle tests, not browser/layout acceptance.
class Node {
 constructor(doc,tag){this.ownerDocument=doc;this.tag=tag;this.children=[];this.dataset={};this.attrs={};this.handlers={};this.parent=null;this.hidden=false;}
 append(...children){for(const child of children){child.parent=this;this.children.push(child);}}
 replaceChildren(){for(const child of this.children)child.parent=null;this.children=[];}
 contains(node){return node===this||this.children.some(c=>c.contains(node));}
 remove(){if(this.parent){this.parent.children=this.parent.children.filter(c=>c!==this);this.parent=null;}}
 setAttribute(key,value){this.attrs[key]=value;}
 addEventListener(key,handler){this.handlers[key]=handler;}
 click(){this.handlers.click?.();}
 focus(){this.ownerDocument.activeElement=this;}
 get isConnected(){return this.ownerDocument.body.contains(this);}
 find(predicate){if(predicate(this))return this;for(const c of this.children){const hit=c.find(predicate);if(hit)return hit;}}
}
function setup(){
 const doc={activeElement:null,createElement(tag){return new Node(this,tag);}};
 doc.body=doc.createElement('body');const host=doc.createElement('div');doc.body.append(host);
 const counts={previews:0,releases:0,galleries:0,retired:0,updates:0};const edits=[],views=[],galleries=[];
 let locked=false,accept=true,missing=false;const members=new Map(['rook','moss'].map(id=>[id,{id,weapon:'m4',appearanceSeed:1,loadout:{slots:{primary:'m4',head:'none',belt:'none'}},magazines:[]}]));
 const source=()=>new Map([['primary',{value:'m4',options:[]}],['head',{value:'none',options:[]}],['belt',{value:'none',options:[]}]]);
 const workspace=createEquipmentWorkspace({
  createPreview:(host,id,w,seed,kit,config,mags,wardrobe,focus,azimuth)=>{
   counts.previews++;const p={id,azimuth:azimuth??0,focus,kit,tap:null,disposed:false,
    isReady(){return !this.disposed;},setOnTapSlot(fn){this.tap=fn;},dispose(){this.disposed=true;counts.releases++;},
    setOperatorId(id){this.id=id;},attachHost(){},updateEquipment(w,s,k){this.kit=k;counts.updates++;},
    getAzimuth(){return this.azimuth;},setAzimuth(n){this.azimuth=n;},clearTransientSelection(){},focusOn(f){this.focus=f;},setSelectedSlot(s){this.slot=s;},setWeaponPresentation(held){this.held=held;},selectItemDot(){},renderModelThumbnailAsync(t){return Promise.resolve(t.itemId);}};
   views.push(p);return p;
  },
  createGallery:options=>{counts.galleries++;const g={options,slot:null,root:options.host,show(s){this.slot=s;},getActive(){return this.slot;},dispose(){counts.retired++;}};galleries.push(g);return g;}
 });
 const operators=createStudioOperatorEquipment({readOperator:id=>missing||!members.has(id)?null:{member:members.get(id),sources:source(),locked,thumbnailTarget:(slot,itemId)=>({kind:'gear',slot,itemId})},
  equip:(id,slot,itemId)=>{edits.push([id,slot,itemId]);if(!accept)return false;const m=members.get(id);members.set(id,{...m,loadout:{slots:{...m.loadout.slots,[slot]:itemId}}});return true;},onAdvanced:id=>edits.push(['advanced',id])},()=>workspace);
 const shell=mountStudioShell(host,{context:{mode:'quick',operatorId:'rook',returnTo:'board'},workspaces:{operators,arsenal:()=>({update(){},dispose(){}})},canLeave:()=>true,onClose:()=>{}});
 return {host,shell,counts,edits,views,galleries,workspace,lock:v=>locked=v,accept:v=>accept=v,missing:v=>missing=v,button:slot=>host.find(n=>n.dataset.slot===slot)};
}
test('actual workspace owner reuses preview and gallery for category changes; drawer closes and reopens',()=>{
 const s=setup();assert.equal(s.counts.previews,1);assert.equal(s.counts.galleries,0);
 s.button('head').click();assert.equal(s.galleries.at(-1).slot,'head');assert.equal(s.views[0].focus,'head');
 s.button('belt').click();assert.equal(s.counts.galleries,1);assert.equal(s.counts.previews,1);assert.equal(s.galleries[0].slot,'belt');
 s.button('belt').click();assert.equal(s.counts.retired,1);assert.equal(s.views[0].focus,'full');assert.equal(s.shell.route.category,null);
 s.views[0].tap('head');assert.equal(s.counts.galleries,2);s.shell.dispose();assert.equal(s.counts.releases,1);
});
test('host-authorized equip refreshes actual kit; rejected and retired callbacks cannot leave stale selection',()=>{
 const s=setup();s.shell.selectCategory('head');const old=s.galleries.at(-1).options;
 old.onEquip('head','ach');assert.deepEqual(s.edits,[['rook','head','ach']]);assert.equal(s.views[0].kit.slots.head,'ach');assert.equal(s.counts.previews,1);
 old.onEquip('head','stale');assert.equal(s.edits.length,1);
 s.accept(false);const next=s.galleries.at(-1).options;next.selectedItems.set('head','rejected');next.onEquip('head','rejected');assert.equal(s.workspace.memoryFor('rook').selectedItems.has('head'),false);assert.equal(s.views[0].kit.slots.head,'ach');
 const oldButton=s.button('head');s.lock(true);s.shell.selectOperator('moss','head');oldButton.click();assert.equal(s.shell.route.category,'head');s.galleries.at(-1).options.onEquip('head','no');assert.equal(s.edits.length,2);s.shell.dispose();
});
test('Arsenal return restores per-operator orbit and gallery memory; missing snapshot releases preview',()=>{
 const s=setup();s.shell.selectCategory('primary');s.views[0].azimuth=1.4;s.workspace.memoryFor('rook').scrollPositions.set('primary',42);
 const old=s.galleries[0].options;old.onArsenal();assert.equal(s.shell.route.workspace,'arsenal');assert.equal(s.counts.releases,1);old.onEquip('primary','stale');assert.equal(s.edits.length,0);
 s.shell.back();assert.equal(s.shell.route.category,'primary');assert.equal(s.views.at(-1).azimuth,1.4);assert.equal(s.galleries.at(-1).options.scrollPositions.get('primary'),42);
 s.missing(true);s.shell.selectOperator('moss','belt');assert.equal(s.workspace.preview,null);assert.equal(s.counts.releases,2);s.shell.dispose();
});
