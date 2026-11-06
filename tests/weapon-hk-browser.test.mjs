import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY_PRESETS} from '../src/equipment-weapon-families.ts';
import {createWeaponPresetBrowser} from '../src/ui/weapon-preset-browser.ts';

class StubElement {
 constructor(tag){this.tag=tag;this.children=[];this.dataset={};this.style={};this.attrs={};this.events={};}
 append(...items){this.children.push(...items);}
 replaceChildren(...items){this.children=[...items];}
 setAttribute(key,value){this.attrs[key]=value;}
 addEventListener(key,fn){this.events[key]=fn;}
}
test('weapon browser exposes both G3 factory models under an HK tab',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:(tag)=>new StubElement(tag)};
 try{
  const selected=[];
  const outer=createWeaponPresetBrowser({onSelect:id=>selected.push(id)});
  const tabs=outer.children[2],grid=outer.children[3];
  assert.deepEqual(tabs.children.map(c=>c.textContent),['AR · 8','AK · 9','HK · 2']);
  const hk=tabs.children.find(c=>c.textContent==='HK · 2');
  hk.events.click();
  assert.deepEqual(grid.children.map(c=>c.dataset.weaponPreset),['hk-g3','hk-g3a3']);
  assert.equal(grid.children.every(c=>c.disabled===false),true);
  grid.children[1].events.click();
  assert.deepEqual(selected,['hk-g3a3']);
  assert.equal(FAMILY_PRESETS.filter(p=>p.family==='hk').length,2);
 }finally{globalThis.document=previous}
});
