import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeSavedBuildName,allocateSavedBuildId,parseSavedBuildEntries,
 readStoredSavedBuilds,writeStoredSavedBuilds}
 from '../src/arsenal/saved-build-library-common.ts';
import {readGlockLibrary,factoryGlockRecipe} from '../src/arsenal/glock-saved-builds.ts';

test('preset libraries share bounded names, valid record IDs and deduplication',()=>{
 assert.equal(normalizeSavedBuildName('  Duty    G19  '),'Duty G19');
 assert.equal(normalizeSavedBuildName(null),'');
 assert.equal(normalizeSavedBuildName('x'.repeat(90)).length,32);
 assert.equal(allocateSavedBuildId([{id:'p-1'},{id:'p-3'}],'p-'),'p-2');
 const records=[
  {id:'p-1',name:' Alpha  One ',recipe:1},
  {id:'p-1',name:'duplicate',recipe:2},
  {id:'p-0',name:'bad',recipe:2},
  {id:'p-2',name:'  ',recipe:3},
  {id:'p-3',name:'ok',recipe:3},
  {id:'p-4',name:'overflow',recipe:4}
 ];
 const decoded=parseSavedBuildEntries({version:1,builds:records},'p-',2,
  value=>typeof value==='number'?{index:value}:null);
 assert.deepEqual(decoded,[
  {id:'p-1',name:'Alpha One',recipe:{index:1}},
  {id:'p-3',name:'ok',recipe:{index:3}}
 ]);
 assert.deepEqual(parseSavedBuildEntries('{','p-',2,v=>v),[]);
 assert.deepEqual(parseSavedBuildEntries({version:2,builds:records},
  'p-',2,v=>v),[]);
});

test('Glock library retains its own recipe validation under shared parser',()=>{
 const recipe=factoryGlockRecipe('glock-g19x');
 const parsed=readGlockLibrary({version:1,builds:[
  {id:'glock-build-1',name:'  Duty    Glock ',recipe},
  {id:'glock-build-2',name:'invalid',recipe:{...recipe,model:'forged'}},
  {id:'arsenal-3',name:'wrong family',recipe}
 ]});
 assert.equal(parsed.builds.length,1);
 assert.equal(parsed.builds[0].name,'Duty Glock');
 assert.equal(parsed.builds[0].recipe.model,'glock-g19x');
});

test('storage failures preserve truthful error reporting',()=>{
 // Node has no DOM localStorage: return the fallback or a failed write.
 assert.deepEqual(readStoredSavedBuilds('none',()=>({version:1,builds:[1]}),
  ()=>({version:1,builds:[]})),{version:1,builds:[]});
 assert.equal(writeStoredSavedBuilds('none',{version:1,builds:[]}),false);
});
