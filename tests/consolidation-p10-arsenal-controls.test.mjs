import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArsenalSavedActionButtons,renderArsenalFilterButtons}
 from '../src/arsenal/gallery-browser-controls.ts';
const src=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

test('P10: shared controls build correct semantic buttons and preserve order',()=>{
 const previous=globalThis.document;
 class Node{
  constructor(tag){this.tagName=tag;this.children=[];this.attrs=new Map();}
  append(node){this.children.push(node);}
  replaceChildren(...nodes){this.children=nodes;}
  setAttribute(name,value){this.attrs.set(name,value);}
  getAttribute(name){return this.attrs.get(name);}
  addEventListener(name,listener){this[name+'Handler']=listener;}
  click(){this.clickHandler?.();}
 }
 globalThis.document={createElement:tag=>new Node(tag)};
 try{
  const host=new Node('div');
  const seen=[];
  const options=[{id:'all',name:'All'},{id:'saved',name:'Saved · 3'}];
  renderArsenalFilterButtons(host,options,'all',id=>seen.push(id));
  assert.deepEqual(host.children.map(x=>x.textContent),['All','Saved · 3']);
  assert.deepEqual(host.children.map(x=>x.type),['button','button']);
  assert.deepEqual(host.children.map(x=>x.getAttribute('aria-pressed')),['true','false']);
  host.children[1].click();
  assert.deepEqual(seen,['saved']);
  renderArsenalFilterButtons(host,options,'saved',id=>seen.push(id));
  assert.equal(host.children.length,2,'new controls replace rather than duplicate');
  assert.deepEqual(host.children.map(x=>x.getAttribute('aria-pressed')),['false','true']);
  const actions=createArsenalSavedActionButtons();
  assert.deepEqual(Object.values(actions).map(x=>x.textContent),
   ['RENAME','DUPLICATE','DELETE']);
  assert.ok(Object.values(actions).every(x=>x.type==='button'));
  assert.equal(new Set(Object.values(actions)).size,3);
 }finally{globalThis.document=previous;}
});

test('P10: both galleries share presentation buttons, not persistence or weapon authority',()=>{
 const common=src('arsenal/gallery-browser-controls.ts');
 const primary=src('arsenal/gallery-main.ts');
 const glock=src('arsenal/glock-gallery.ts');
 for(const gallery of [primary,glock]){
  assert.match(gallery,/createArsenalSavedActionButtons\(\)/);
  assert.match(gallery,/renderArsenalFilterButtons\(/);
 }
 assert.match(primary,/persistArsenalBuildLibrary\(/);
 assert.match(primary,/renameSavedArsenalBuild\(/);
 assert.match(primary,/duplicateSavedArsenalBuild\(/);
 assert.match(primary,/deleteSavedArsenalBuild\(/);
 assert.match(glock,/saveGlockLibrary\(/);
 assert.match(glock,/renameGlockSavedBuild\(/);
 assert.match(glock,/duplicateGlockSavedBuild\(/);
 assert.match(glock,/deleteGlockSavedBuild\(/);
 const chrome=src('arsenal/gallery-chrome.ts');
 assert.match(primary,/createArsenalGalleryChrome\('primary'\)/);
 assert.match(glock,/createArsenalGalleryChrome\('secondary'\)/);
 assert.match(chrome,/arsenal-saved-actions/);
 assert.match(chrome,/arsenal-glock-saved-actions/);
 assert.doesNotMatch(common,/localStorage|loadArsenalBuildLibrary|loadGlockLibrary|ammo|equipRoster|THREE/);
});
