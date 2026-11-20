import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createOutfitterZoneNav,OUTFITTER_ZONE_LABELS,
 previewFocusForOutfitterSlot} from '../src/ui/outfitter-zone-nav.ts';

const src=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('P8 shares exactly one ordered zone list and camera focus mapping',()=>{
 const slots=OUTFITTER_ZONE_LABELS.map(([slot])=>slot);
 assert.deepEqual(slots,[
  'primary','head','armor','rig','belt','backpack',
  'medical','utility','top','legs','hands','feet'
 ]);
 assert.deepEqual(slots.map(slot=>previewFocusForOutfitterSlot(slot)),[
  'weapon','head','torso','torso','belt','back',
  'belt','belt','torso','legs','full','legs'
 ]);
 assert.equal(new Set(slots).size,slots.length);
});

test('P8 selection retains class, order, accessible current state and callback',()=>{
 const previous=globalThis.document;
 class FakeElement{
  constructor(tag){this.tagName=tag;this.children=[];this.dataset={};this.attrs=new Map();}
  append(...children){this.children.push(...children);}
  setAttribute(k,v){this.attrs.set(k,v);}
  getAttribute(k){return this.attrs.get(k);}
  addEventListener(k,fn){this[k]=fn;}
  click(){this.click();}
 }
 globalThis.document={createElement:tag=>new FakeElement(tag)};
 try{
  const selected=[];
  const {nav,select}=createOutfitterZoneNav({
   navClass:'parent-zone',buttonClass:'child-zone',
   selected:'primary',onSelect:slot=>selected.push(slot)
  });
  assert.equal(nav.className,'parent-zone');
  assert.equal(nav.getAttribute('aria-label'),'Equipment locations');
  assert.equal(nav.children.length,12);
  assert.ok(nav.children.every(el=>el.type==='button'&&el.className==='child-zone'));
  assert.equal(nav.children[0].getAttribute('aria-current'),'true');
  assert.ok(nav.children.slice(1).every(el=>el.getAttribute('aria-current')==='false'));
  const feet=nav.children.at(-1);
  feet.click();
  assert.equal(feet.dataset.slot,'feet');
  assert.equal(feet.getAttribute('aria-current'),'true');
  assert.equal(nav.children[0].getAttribute('aria-current'),'false');
  select('head');
  assert.deepEqual(selected,['feet','head']);
  assert.equal(nav.children[1].getAttribute('aria-current'),'true');
  assert.equal(feet.getAttribute('aria-current'),'false');
 }finally{globalThis.document=previous;}
});

test('P8 consumers retain their owner state and call one shared rail/focus policy',()=>{
 const quick=src('ui/quick-play-configurator.ts');
 const board=src('breach-operations-board-controller.ts');
 const shared=src('ui/outfitter-zone-nav.ts');
 for(const owner of [quick,board]){
  assert.match(owner,/createOutfitterZoneNav\(\{/);
  assert.match(owner,/previewFocusForOutfitterSlot\(slot\)/);
  assert.doesNotMatch(owner,/zoneButtons=new Map/);
  assert.doesNotMatch(owner,/\['primary','WEAPON'\],\['head','HEAD'\]/);
 }
 assert.match(quick,/selectedSquadSlot=slot/);
 assert.match(quick,/onSelectCategory:chooseSlot/);
 assert.match(quick,/setOnTapSlot\(slot=>chooseSlot\(slot\)\)/);
 assert.match(board,/quickBenchSlot=slot/);
 assert.match(board,/onSelectCategory:selectZone/);
 assert.match(board,/setOnTapSlot\(selectZone\)/);
 assert.match(board,/clearTransientSelection\(\)/);
 assert.match(shared,/options\.onSelect\(slot\)/);
 assert.doesNotMatch(shared,/equipRoster|equipCampaign|setRoster|localStorage/);
});
