import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {LOADOUT_SLOTS} from '../src/equipment-catalog.ts';
import {QUICK_LOADOUT_GROUPS,loadoutGroupForSlot}
 from '../src/ui/quick-loadout-groups.ts';
import {createTacticalSheetNavigation}
 from '../src/ui/tactical-sheet-navigation.ts';

const read=(path)=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const main=read('src/breach-main.ts'),html=read('index.html');
test('purpose-specific loadout groups retain every supported operational equipment slot',()=>{
 const expected={
  primary:'weapon',head:'protection',armor:'protection',
  rig:'carry',belt:'carry',backpack:'carry',
  medical:'utilities',tactical:'utilities',utility:'utilities',
  top:'issued',legs:'issued',hands:'issued',feet:'issued'
 };
 assert.equal(QUICK_LOADOUT_GROUPS.length,5);
 assert.deepEqual([...LOADOUT_SLOTS].sort(),Object.keys(expected).sort());
 for(const slot of LOADOUT_SLOTS)
  assert.equal(loadoutGroupForSlot(slot),expected[slot],slot);
 assert.ok(QUICK_LOADOUT_GROUPS.some(group=>group.id==='issued'),
  'issued basic clothing still exists as equipment, independently from appearance');
});
test('Squad has one canonical appearance path and functional loadout actions remain',()=>{
 assert.match(main,/openOperatorStudio\(member.id,'quick'\)/);
 assert.match(main,/buildQuickLoadoutGroups\(kit,/);
 assert.match(main,/loadout\.field\('weapon'\)\.append\(weaponEditor\)/);
 assert.match(main,/loadout\.field\('carry'\)\.append\(magSection\)/);
 assert.match(main,/configureRosterWeapon\(/);
 assert.match(main,/moveRosterMagazine\(/);
 assert.match(main,/resupplyRoster\(/);
 assert.match(main,/equipRosterGear\(/);
 assert.match(main,/promptFieldworkText\(/);
 assert.doesNotMatch(main,/createWardrobeFabricCamoPicker\(/);
 assert.doesNotMatch(main,/createHeadwearAppearancePicker\(/);
 assert.doesNotMatch(main,/WARDROBE_SLOTS/);
 assert.doesNotMatch(main,/window\.prompt\('Operator callsign'/);
});
test('mission uses three focused tabs, preserves current/next site and camera controls',()=>{
 assert.match(html,/data-site-tab="mission"/);
 assert.match(html,/data-site-tab="environment"/);
 assert.match(html,/data-site-tab="preferences"/);
 assert.match(html,/data-site-panel="mission"/);
 assert.match(html,/data-site-panel="environment" hidden/);
 assert.match(html,/data-site-panel="preferences" hidden/);
 assert.match(html,/<section id="siteSettings"[^>]+role="dialog" aria-modal="true"/);
 for(const id of ['siteIdentity','briefingToggle','restart','variant',
  'siteSize','intelMode','siteLighting','viewIso','viewTop','view2d',
  'cameraFit','uiHelp','uiSoundToggle','closeSiteSettings'])
  assert.ok(html.includes('id="'+id+'"'),id);
 assert.doesNotMatch(html,/id="openOperatorStudio"/);
 assert.match(main,/selectMissionSettingsTab\('mission'\)/);
 assert.match(main,/if\(opening\)tacticalSheetNavigation\.focusFirst\(\)/);
});
test('all large sheets have one shield and preserve gameplay focus ownership',()=>{
 const css=read('src/ui/ux-r1-sheets.css');
 assert.match(css,/#tacticalSheetShield\[hidden\]/);
 assert.match(css,/\.site-settings\[hidden\]/);
 assert.match(css,/\.fw-squad-sheet\[hidden\]/);
 assert.match(main,/collapseTacticalSheets\(opening\?'squad':null\)/);
 assert.match(main,/collapseTacticalSheets\(opening\?'settings':null\)/);
 assert.match(main,/tacticalSheetNavigation\.sync\(\)/);
 assert.match(main,/tacticalSheetNavigation\.focusFirst\(\)/);
});
test('sheet focus trap, outside click and Escape dismiss only the active surface',()=>{
 const originalDocument=globalThis.document,originalRaf=globalThis.requestAnimationFrame;
 class FakeElement{
  hidden=true;listeners=new Map();attributes={};children=[];
  isConnected=true;
  constructor(){this.hidden=false;}
  setAttribute(k,v){this.attributes[k]=v;}
  addEventListener(type,fn){this.listeners.set(type,fn);}
  querySelectorAll(){return this.children;}
  getClientRects(){return [{x:1}];}
  closest(){return null;}
  focus(){globalThis.document.activeElement=this;}
 }
 const document={
  activeElement:null,body:{dataset:{},append(){}},
  createElement(){return new FakeElement();},
  listeners:new Map(),addEventListener(type,fn){this.listeners.set(type,fn);}
 };
 globalThis.document=document;
 globalThis.requestAnimationFrame=(cb)=>{cb();return 1;};
 const regions={settings:new FakeElement(),squad:new FakeElement(),
  briefing:new FakeElement()};
 for(const region of Object.values(regions))region.hidden=true;
 const toggle=new FakeElement();document.activeElement=toggle;
 const closes=[];
 try{
  const nav=createTacticalSheetNavigation(regions,kind=>{
   closes.push(kind);regions[kind].hidden=true;
  });
  assert.equal(nav.active,null);
  regions.settings.hidden=false;
  const a=new FakeElement(),b=new FakeElement();
  regions.settings.children=[a,b];
  nav.sync();assert.equal(nav.active,'settings');
  assert.equal(document.body.dataset.tacticalSheet,'settings');
  nav.focusFirst();assert.equal(document.activeElement,a);
  document.activeElement=b;
  let prevented=0;
  document.listeners.get('keydown')({
   key:'Tab',shiftKey:false,preventDefault(){prevented++},
   stopPropagation(){}});
  assert.equal(document.activeElement,a);
  assert.equal(prevented,1);
  document.listeners.get('keydown')({
   key:'Escape',preventDefault(){prevented++},
   stopPropagation(){}});
  assert.deepEqual(closes,['settings']);
  assert.equal(nav.active,null);
  assert.equal(document.body.dataset.tacticalSheet,'');
  assert.equal(document.activeElement,toggle);
  regions.squad.hidden=false;nav.sync();
  nav.dismiss();assert.deepEqual(closes,['settings','squad']);
 }finally{
  globalThis.document=originalDocument;
  globalThis.requestAnimationFrame=originalRaf;
 }
});
