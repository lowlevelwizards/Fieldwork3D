import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {headwearCamoPixels,headwearCamoSize,HEADWEAR_CAMO_IDS}
 from '../src/operator-headwear-camo.ts';
import {CAMO_FILTER_STORAGE_KEY,defaultCamoBrowserState,camoBrowserState,
 saveCamoBrowserState,resetCamoBrowserState,camoBrowseSection,camoRelatedTo,
 browseCamos,readCamoBrowserPrefs} from '../src/operator-material-browser.ts';
import {getCamoPreviewSource,paintCamoPreview,camoPreviewCacheSize}
 from '../src/operator-camo-preview-cache.ts';

const file=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('saved material filters are validated and survive picker rebuilding',()=>{
 const db=new Map([[CAMO_FILTER_STORAGE_KEY,JSON.stringify({
  'studio:top':{sort:'family',environment:'woodland',family:'Pencott',
   origin:'Britain',style:'digital',era:'modern',favoritesOnly:true,
   advancedOpen:true,search:'do not retain'},
  'studio:bad':{sort:'malicious',family:'invalid',era:'none',
   favoritesOnly:'sure',advancedOpen:'sure',search:'never'}
 })]]);
 globalThis.localStorage={
  getItem:key=>db.get(key)??null,
  setItem:(key,value)=>{db.set(key,value);},
  removeItem:key=>{db.delete(key);}
 };
 const state=camoBrowserState('studio:top');
 assert.equal(state.sort,'family');
 assert.equal(state.environment,'woodland');
 assert.equal(state.family,'Pencott');
 assert.equal(state.advancedOpen,true);
 assert.equal(state.search,'');
 const invalid=camoBrowserState('studio:bad');
 assert.deepEqual(invalid,defaultCamoBrowserState());
 state.search='transient search';
 state.sort='recent';
 saveCamoBrowserState('studio:top');
 const stored=JSON.parse(db.get(CAMO_FILTER_STORAGE_KEY));
 assert.equal(stored['studio:top'].sort,'recent');
 assert.ok(!('search' in stored['studio:top']));
 assert.equal(camoBrowserState('studio:top'),state,'stable object survives picker rebuilding');
 resetCamoBrowserState('studio:top');
 assert.deepEqual(state,defaultCamoBrowserState());
 assert.equal(JSON.parse(db.get(CAMO_FILTER_STORAGE_KEY))['studio:top'].sort,'smart');
});
test('smart and family modes group genuinely related camouflage',()=>{
 assert.ok(camoRelatedTo('multicam-tropic','multicam'));
 assert.ok(camoRelatedTo('british-mtp','multicam'));
 assert.equal(camoRelatedTo('pencott-metropolis','multicam'),false);
 assert.ok(camoRelatedTo('erdl-lowland','m81-woodland'),
  'organic woodland and US-origin pattern can be related without claiming one named family');
 assert.equal(camoRelatedTo('jgsdf-type2','m81-woodland'),false);
 const prefs={favorites:[],recents:[]};
 const smart=browseCamos(['m81-woodland','erdl-lowland','multicam','jgsdf-type2'],
  {active:'m81-woodland',prefs});
 assert.equal(smart[0],'m81-woodland');
 assert.equal(smart[1],'erdl-lowland');
 assert.match(camoBrowseSection('erdl-lowland',{
  state:{sort:'smart'},active:'m81-woodland',prefs}),/RELATED TO SELECTION/);
 const family=browseCamos(HEADWEAR_CAMO_IDS,{
  state:{sort:'family'},prefs
 });
 let prev='';
 const headings=[];
 for(const id of family){
  const current=camoBrowseSection(id,{state:{sort:'family'},prefs});
  if(current!==prev)headings.push(current);
  prev=current;
 }
 assert.ok(headings.includes('MULTICAM'));
 assert.ok(headings.some(s=>s.startsWith('OTHER · BRUSHSTROKE')));
 assert.ok(headings.some(s=>s.startsWith('OTHER · ORGANIC')));
 assert.ok(headings.length<HEADWEAR_CAMO_IDS.length/2,
  'family mode should make meaningful groups rather than one heading per print');
});
test('cached native swatches preserve source size and reuse the same pixel atlas',()=>{
 const originalDocument=globalThis.document;
 let imageWrites=0,draws=0;
 const canvases=[];
 function makeCanvas(){
  const ctx={
   imageSmoothingEnabled:true,
   createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),
   putImageData:()=>{imageWrites++;},
   clearRect:()=>{},
   drawImage:()=>{draws++;}
  };
  const canvas={width:300,height:150,dataset:{},getContext:()=>ctx};
  canvases.push(canvas);return canvas;
 }
 globalThis.document={createElement:type=>{
  assert.equal(type,'canvas');return makeCanvas();
 }};
 try{
  const bytes=headwearCamoPixels('m81-woodland').slice();
  const source=getCamoPreviewSource('m81-woodland');
  assert.equal(source.width,headwearCamoSize('m81-woodland'));
  assert.equal(source,getCamoPreviewSource('m81-woodland'));
  const dest1=makeCanvas(),dest2=makeCanvas();
  paintCamoPreview(dest1,'m81-woodland');
  paintCamoPreview(dest2,'m81-woodland');
  assert.equal(imageWrites,1,'one ImageData conversion per pattern');
  assert.equal(draws,2,'each target copies from the shared source');
  assert.equal(dest1.dataset.camoPreview,'m81-woodland');
  assert.equal(dest1.width,source.width);
  assert.deepEqual(headwearCamoPixels('m81-woodland'),bytes,'approved pixels remain immutable');
  assert.equal(camoPreviewCacheSize(),1);
 }finally{globalThis.document=originalDocument;}
});
test('Studio, Quick Play, Campaign and Lab use shared previews and grouped results',()=>{
 const studio=file('src/operator-studio.ts');
 const headwear=file('src/operator-headwear-picker.ts');
 const fabric=file('src/operator-fabric-camo-picker.ts');
 const lab=file('src/breach-operator-lab.ts');
 for(const source of [studio,headwear,fabric,lab])
  assert.match(source,/appendCamoSectionHeading/);
 for(const source of [studio,headwear,fabric])
  assert.match(source,/createCamoResultSummary/);
 for(const source of [studio,headwear,fabric])
  assert.match(source,/paintCamoPreview\(canvas,id\)/);
 assert.match(lab,/getCamoPreviewSource\(id\)/);
 assert.match(lab,/syncCamoBrowserPreferences\(\)/);
 assert.match(file('src/operator-material-browser-ui.ts'),/resetCamoBrowserState\(key\)/);
 assert.match(file('src/operator-material-browser-ui.ts'),/saveCamoBrowserState\(key\)/);
 assert.match(headwear,/const cards=new Map<HeadwearCamoId,HTMLDivElement>/);
 assert.match(fabric,/const cards=new Map<HeadwearCamoId,HTMLDivElement>/);
 assert.match(headwear,/grid\.scrollTop=position/);
 assert.match(fabric,/grid\.scrollTop=position/);
 const prefs=readCamoBrowserPrefs();
 assert.ok(Array.isArray(prefs.recents));
});
