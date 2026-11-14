import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {initialWardrobe,readWardrobe,wardrobeItemsForSlot}
 from '../src/operator-wardrobe-data.ts';
import {activeAppearanceItems} from '../src/operator-appearance-grid.ts';
import {BALLISTIC_CUT_SHELL,ballisticHelmetCut,canonicalBallisticHelmet}
 from '../src/operator-ballistic-helmet-cut.ts';
import {headwearCuboidVolumes} from '../src/operator-headwear-silhouettes.ts';
import {achMichProfile} from '../src/operator-ach-mich-details.ts';

test('H15: only one ballistic family card, all other helmet types retained',()=>{
 const displayed=activeAppearanceItems('headwear');
 const ids=displayed.map(x=>x.id);
 assert.equal(displayed.filter(x=>ballisticHelmetCut(x.id)).length,1);
 assert.equal(displayed.find(x=>x.id==='ach')?.name,'Ballistic Helmet');
 for(const id of ['high-cut','high-cut-rails','mich-2001','mich-2002',
  'fast-sf','fast-xp-mid'])assert.ok(!ids.includes(id),id);
 for(const id of ['pasgt','m1-steel','soviet-steel','ddr-m56','police-helmet'])
  assert.ok(ids.includes(id),id);
 // IDs are intentionally still valid for historic assets and input migration.
 for(const id of ['high-cut','mich-2001','fast-sf','fast-xp-mid'])
  assert.ok(wardrobeItemsForSlot('headwear').some(x=>x.id===id));
});

test('H15: exactly three canonical cuts with no new shell renderer',()=>{
 assert.deepEqual(BALLISTIC_CUT_SHELL,{
  full:'ach',mid:'mich-2002',high:'mich-2001'
 });
 const legacy={
  'high-cut':'mich-2001','high-cut-rails':'mich-2001',
  'fast-sf':'mich-2001','fast-xp-mid':'mich-2002'
 };
 for(const [old,expected] of Object.entries(legacy))
  assert.equal(canonicalBallisticHelmet(old),expected);
 for(const id of ['ach','mich-2002','mich-2001'])
  assert.equal(canonicalBallisticHelmet(id),id);
 assert.equal(ballisticHelmetCut('pasgt'),null);
});

test('H15: legacy saves migrate shell while preserving all customization state',()=>{
 const seed=initialWardrobe();
 for(const [from,to] of [
  ['high-cut','mich-2001'],['high-cut-rails','mich-2001'],
  ['fast-sf','mich-2001'],['fast-xp-mid','mich-2002'],
  ['mich-2001','mich-2001'],['mich-2002','mich-2002']
 ]){
  const incoming={...seed,styles:{...seed.styles,headwear:from},
   helmetField:{shroud:true,rails:true,bungees:true,goggles:'front',
    camera:true,cameraSide:'left'},helmetSetup:{cover:'fitted'},
   headwearColor:'olive-drab'};
  const result=readWardrobe(incoming);
  assert.equal(result.styles.headwear,to,from);
  assert.equal(result.helmetField?.rails,true);
  assert.equal(result.helmetField?.bungees,true);
  assert.equal(result.helmetField?.goggles,'front');
  assert.equal(result.helmetSetup?.cover,'fitted');
  assert.equal(incoming.styles.headwear,from,'never modify input in-place');
  assert.equal(readWardrobe(result).styles.headwear,to,'round-trip');
 }
});

test('H15: legacy H1 rail/lights/optic hardware maps into H7 without being lost',()=>{
 const original={...initialWardrobe(),styles:{
  ...initialWardrobe().styles,headwear:'fast-sf'
 },helmetSetup:{rails:'arc',shroud:'integrated',cover:'fitted',
  light:'right',rearModule:'counterweight',rearStrobe:true,scrim:'field'}};
 const migrated=readWardrobe(original);
 assert.equal(migrated.styles.headwear,'mich-2001');
 assert.equal(migrated.helmetSetup?.rails,'arc',
  'archived H1 options remain saved');
 assert.equal(migrated.helmetField?.rails,true);
 assert.equal(migrated.helmetField?.shroud,true);
 assert.equal(migrated.helmetField?.light,true);
 assert.equal(migrated.helmetField?.lightSide,'right');
 assert.equal(migrated.helmetField?.counterweight,true);
 assert.equal(migrated.helmetField?.strobe,true);
 assert.equal(migrated.helmetField?.concealment,'scrim');
 const explicit={...original,helmetField:{rails:false,shroud:false}};
 assert.equal(readWardrobe(explicit).helmetField?.rails,false,
  'newer H7 choices override legacy migration');
});
test('H15: deliberate minor silhouette refinements keep bindings on shell',()=>{
 const mid=headwearCuboidVolumes('mich-2002')
  .find(x=>x.name==='m2002-right-front-temple');
 const high=headwearCuboidVolumes('mich-2001')
  .find(x=>x.name==='m2001-short-temple');
 assert.ok(mid&&high);
 assert.ok(Math.abs(mid.y-mid.height/2-4.45)<1e-5);
 assert.ok(Math.abs(high.y-high.height/2-6.025)<1e-5);
 assert.equal(achMichProfile('mich-2002').hem[1][1],4.45);
 assert.equal(achMichProfile('mich-2001').hem[1][1],6.025);
 assert.ok(high.y-high.height/2>mid.y-mid.height/2+1.0);
});

test('H15: shell cuts are first in Details; shell change does not reset accessories',()=>{
 const source=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 const start=source.indexOf("if(activeCategory==='headwear'){");
 const cut=source.indexOf("row('BALLISTIC HELMET CUT'",start);
 const headwear=source.indexOf("row('HEADWEAR APPEARANCE'",start);
 assert.ok(start>=0&&cut>start&&headwear>cut,
  'cut selector must precede other headwear controls');
 assert.ok(source.includes('helmet-cut-card'));
 assert.ok(source.includes('headwear:BALLISTIC_CUT_SHELL[choice.id]'));
 assert.ok(source.includes('...before.styles,'));
 assert.ok(source.includes("id==='ach'&&ballisticHelmetCut(current().styles.headwear)"));
});
