import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createArsenalGalleryChrome} from '../src/arsenal/gallery-chrome.ts';
import {createArsenalGalleryCard} from '../src/arsenal/gallery-browser-controls.ts';

class FakeNode{
 constructor(tagName){this.tagName=tagName;this.className='';this.textContent='';
  this.attributes=new Map();this.children=[];this.hidden=false;}
 setAttribute(key,value){this.attributes.set(key,value);}
 getAttribute(key){return this.attributes.get(key);}
 append(...children){this.children.push(...children);}
 find(className){
  if(this.className.split(' ').includes(className))return this;
  for(const child of this.children){const found=child.find(className);if(found)return found;}
  return null;
 }
}
test('P11: one semantic Arsenal shell preserves separate primary/secondary CSS and aria contracts',()=>{
 const prev=globalThis.document;
 globalThis.document={createElement:tag=>new FakeNode(tag)};
 try{
  const primary=createArsenalGalleryChrome('primary');
  const secondary=createArsenalGalleryChrome('secondary');
  for(const [kind,c] of [['primary',primary],['secondary',secondary]]){
   assert.ok(c.layout.find('arsenal-layout'));
   assert.ok(c.layout.find('arsenal-hero'));
   assert.ok(c.layout.find('arsenal-hero-media'));
   assert.ok(c.layout.find('arsenal-browser'));
   assert.ok(c.layout.find('arsenal-grid'));
   assert.equal(c.hero.children[0],c.heroMedia);
   assert.equal(c.hero.children[1],c.heroCopy);
   assert.deepEqual(c.heroCopy.children,
    [c.heroPlatform,c.heroTitle,c.heroHint,c.openWorkbench,c.savedControls]);
   assert.equal(c.openWorkbench.type,'button');
   assert.equal(c.openWorkbench.textContent,'OPEN WORKBENCH');
   assert.equal(c.savedControls.hidden,true);
   assert.equal(c.search.type,'search');
   assert.equal(c.search.placeholder,'Find a model');
   assert.equal(c.count.getAttribute('aria-live'),'polite');
   assert.equal(c.filters.getAttribute('role'),'group');
   assert.equal(c.layout.find('arsenal-controls')?.children[1],c.search);
   assert.equal(c.layout.find('arsenal-browser')?.children[1],c.filters);
   assert.equal(c.layout.find('arsenal-browser')?.children[3],c.grid);
   assert.equal(c.layout.children.length,2,kind+' has exactly hero and browser');
  }
  assert.equal(primary.layout.tagName,'div');
  assert.equal(primary.hero.tagName,'section');
  assert.equal(primary.hero.getAttribute('aria-label'),'Selected weapon');
  assert.equal(primary.search.getAttribute('aria-label'),'Find weapon model');
  assert.equal(primary.filters.getAttribute('aria-label'),'Weapon platforms');
  assert.equal(primary.grid.getAttribute('role'),undefined);
  assert.match(primary.heroHint.textContent,/full-screen Workbench/);
  assert.equal(secondary.layout.tagName,'section');
  assert.equal(secondary.hero.tagName,'div');
  assert.equal(secondary.layout.getAttribute('aria-label'),
   'Glock family secondary weapon loadouts');
  assert.ok(secondary.layout.find('arsenal-glock-gallery'));
  assert.ok(secondary.layout.find('arsenal-glock-feature'));
  assert.ok(secondary.layout.find('arsenal-glock-hero-visual'));
  assert.ok(secondary.layout.find('arsenal-glock-feature-copy'));
  assert.ok(secondary.layout.find('arsenal-glock-cards'));
  assert.equal(secondary.heroMedia.getAttribute('aria-live'),'polite');
  assert.equal(secondary.search.getAttribute('aria-label'),
   'Find Glock model or saved build');
  assert.equal(secondary.filters.getAttribute('aria-label'),'Secondary model filters');
  assert.equal(secondary.grid.getAttribute('role'),'group');
  assert.equal(secondary.grid.getAttribute('aria-label'),'Glock models and saved builds');
  assert.equal(secondary.heroPlatform.textContent,'GLOCK');
  assert.equal(secondary.heroHint.textContent,'');
 }finally{globalThis.document=prev;}
});
test('P11: shared Arsenal card presenter preserves primary and secondary tag/label contracts',()=>{
 const previous=globalThis.document;
 globalThis.document={createElement:tag=>new FakeNode(tag)};
 try{
  const primary=createArsenalGalleryCard({kind:'primary',name:'M4A1',
   subtitle:'AR PLATFORM',ariaLabel:'Select M4A1',selected:true});
  const secondary=createArsenalGalleryCard({kind:'secondary',name:'Glock 19',
   subtitle:'SAVED · GLOCK',ariaLabel:'Inspect Glock 19',selected:false});
  assert.equal(primary.button.tagName,'button');
  assert.equal(secondary.button.tagName,'button');
  assert.equal(primary.button.type,'button');
  assert.equal(secondary.button.type,'button');
  assert.equal(primary.button.className,'arsenal-card');
  assert.equal(secondary.button.className,'arsenal-card arsenal-glock-card');
  assert.equal(primary.button.getAttribute('aria-pressed'),'true');
  assert.equal(secondary.button.getAttribute('aria-pressed'),'false');
  assert.equal(primary.button.getAttribute('aria-label'),'Select M4A1');
  assert.equal(secondary.button.getAttribute('aria-label'),'Inspect Glock 19');
  assert.equal(primary.preview.tagName,'div');
  assert.equal(secondary.preview.tagName,'span');
  assert.equal(secondary.preview.className,'arsenal-card-preview arsenal-glock-card-preview');
  assert.deepEqual(primary.button.children.map(x=>x.tagName),['div','strong','span']);
  assert.deepEqual(secondary.button.children.map(x=>x.tagName),['span','strong','small']);
  assert.equal(primary.button.children[1].textContent,'M4A1');
  assert.equal(secondary.button.children[1].textContent,'Glock 19');
  assert.equal(primary.button.children[2].textContent,'AR PLATFORM');
  assert.equal(secondary.button.children[2].textContent,'SAVED · GLOCK');
 }finally{globalThis.document=previous;}
});
test('P11: both galleries delegate shell structure while keeping native handling',()=>{
 const src=p=>readFileSync(new URL('../src/arsenal/'+p,import.meta.url),'utf8');
 const primary=src('gallery-main.ts'),secondary=src('glock-gallery.ts'),shell=src('gallery-chrome.ts');
 assert.match(primary,/createArsenalGalleryChrome\('primary'\)/);
 assert.match(primary,/createArsenalGalleryCard\(/);
 assert.match(secondary,/createArsenalGalleryCard\(/);
 assert.match(secondary,/createArsenalGalleryChrome\('secondary'\)/);
 assert.match(primary,/heroCopy\.append\(renameBox,savedFeedback\)/);
 assert.match(primary,/openArsenalWorkbench\(/);
 assert.match(secondary,/openGlockWorkbench\(/);
 assert.match(secondary,/renderFilters\(\);renderCards\(\)/);
 assert.match(secondary,/previewQueue\.enqueue\(feature/);
 assert.match(primary,/const secondaryGallery=mountGlockArsenalGallery\(\)/);
 assert.doesNotMatch(shell,/THREE|localStorage|saveGlockLibrary|equipRoster|arsenalRecipeFromLegacy/);
});
