import test from 'node:test';
import assert from 'node:assert/strict';
import {photoFilterCss,PHOTO_FILTERS,PHOTO_RATIOS}
 from '../src/breach-photo-capture.ts';
import {INITIAL_PHOTO_SETTINGS,photographCanEnter}
 from '../src/breach-photo-state.ts';
import {PHOTO_LIBRARY_LIMIT} from '../src/breach-photo-library.ts';
test('photo options have stable bounded defaults',()=>{
 assert.equal(INITIAL_PHOTO_SETTINGS.guide,'thirds');
 assert.equal(INITIAL_PHOTO_SETTINGS.ratio,'screen');
 assert.equal(INITIAL_PHOTO_SETTINGS.filter,'original');
 assert.equal(PHOTO_LIBRARY_LIMIT,60);
 assert.deepEqual(PHOTO_FILTERS,['original','muted','mono','warm','contrast']);
 assert.deepEqual(PHOTO_RATIOS,['screen','16:9','4:5','1:1']);
});
test('all photographic filters clamp strength and preserve original',()=>{
 assert.equal(photoFilterCss('original'),'none');
 assert.equal(photoFilterCss('mono',0),'grayscale(0) contrast(1)');
 assert.equal(photoFilterCss('mono',1),'grayscale(1) contrast(1.1)');
 assert.equal(photoFilterCss('mono',99),photoFilterCss('mono',1));
 assert.equal(photoFilterCss('muted',-10),photoFilterCss('muted',0));
 for(const filter of PHOTO_FILTERS)
  assert.equal(typeof photoFilterCss(filter,.5),'string');
});
test('photo entry is gated independently of playback and mission phase',()=>{
 const valid={site:true,loading:false,menu:false,already:false,video:false};
 assert.equal(photographCanEnter(valid),true);
 for(const key of ['loading','menu','already','video'])
  assert.equal(photographCanEnter({...valid,[key]:true}),false,key);
 assert.equal(photographCanEnter({...valid,site:false}),false);
});
test('photographic modules never import the mission simulation',async()=>{
 const {readFile}=await import('node:fs/promises');
 for(const path of ['src/breach-photo-capture.ts','src/breach-photo-library.ts',
  'src/breach-photo-state.ts']){
  const source=await readFile(new URL('../'+path,import.meta.url),'utf8');
  assert.doesNotMatch(source,/stepSession\s*\(|newSession\s*\(/);
 }
});
