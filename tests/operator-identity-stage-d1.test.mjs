import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {readWardrobe,initialWardrobe} from '../src/operator-wardrobe-data.ts';
import {SKIN_TONES,HAIR_STYLES,HAIR_TONES,
 seededSkinTone,seededHairStyle,seededHairTone,
 isSkinToneId,isHairStyleId,isHairToneId} from '../src/operator-identity-palette.ts';

test('identity colors and styles preserve legacy seeded defaults',()=>{
 assert.equal(seededSkinTone(0),'medium-neutral');
 assert.equal(seededHairStyle(0),'buzz');
 assert.equal(seededHairTone(0),'dark-brown');
 assert.equal(seededSkinTone(64),'medium-deep-warm');
 assert.equal(Object.keys(SKIN_TONES).length,10);
 assert.equal(Object.keys(HAIR_STYLES).length,6);
 assert.equal(Object.keys(HAIR_TONES).length,8);
 const migrated=readWardrobe({version:1,styles:{facewear:'face-none'}});
 assert.equal(migrated.skinTone,undefined);
 assert.equal(migrated.hairStyle,undefined);
 assert.equal(migrated.hairTone,undefined);
 assert.deepEqual(initialWardrobe().styles,{});
});
test('skin, haircut, and color overrides round-trip and reject invalid values',()=>{
 const base=readWardrobe({version:1,skinTone:'deep-cool',
  hairStyle:'close-afro',hairTone:'auburn',styles:{}});
 const saved=readWardrobe(JSON.parse(JSON.stringify(base)));
 assert.equal(saved.skinTone,'deep-cool');
 assert.equal(saved.hairStyle,'close-afro');
 assert.equal(saved.hairTone,'auburn');
 assert.ok(isSkinToneId(saved.skinTone));
 assert.ok(isHairStyleId(saved.hairStyle));
 assert.ok(isHairToneId(saved.hairTone));
 const malicious=readWardrobe({version:1,skinTone:'#ff00ff',
  hairStyle:'arbitrarily-long-hair',hairTone:'neon-pink'});
 assert.equal(malicious.skinTone,undefined);
 assert.equal(malicious.hairStyle,undefined);
 assert.equal(malicious.hairTone,undefined);
});
test('identity studio edits do not add equipment or anatomy mutations',()=>{
 const studio=readFileSync(new URL('../src/operator-studio.ts',import.meta.url),'utf8');
 const kit=readFileSync(new URL('../src/operator-visual-kit.ts',import.meta.url),'utf8');
 const rig=readFileSync(new URL('../src/breach-operator-appearance.ts',import.meta.url),'utf8');
 assert.match(studio,/SKIN TONE/);
 assert.match(studio,/HAIRCUT/);
 assert.match(studio,/HAIR COLOR/);
 assert.match(kit,/HAIR_STYLE_IDS\[i\]===hairStyle/);
 assert.match(rig,/for\(const skinMaterial of \[r.skinMaterial,r.faceSkinMaterial/);
 assert.match(rig,/r\.colors\.set\(skinMaterial,new THREE.Color\(SKIN_TONES\[complexion\]\.hex\)\)/);
 assert.doesNotMatch(studio,/setEquipmentChoice\(.*'skinTone'/);
});
