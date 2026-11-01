import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {lightingPresentation} from '../src/equipment-lighting-presentation.ts';
test('26.04 all five settings have coherent 2D and ISO light response',()=>{
 const modes=['day','evening','night','blackout','emergency'];
 const values=modes.map(lightingPresentation);
 assert.equal(values[0].floorTint,0);
 assert.ok(values[0].sun>values[1].sun&&values[1].sun>values[2].sun);
 assert.ok(values[3].hemisphere<values[2].hemisphere);
 assert.ok(values[3].floorTint>values[2].floorTint);
 assert.ok(values.every(v=>v.floorTint>=0&&v.floorTint<1&&v.sun>=0));
});
test('26.04 mode is chosen before deployment, preserved in replay and both views',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../breach.html',import.meta.url),'utf8');
 const iso=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 assert.match(html,/id="siteLighting"/);
 assert.match(main,/state\.lightingMode=finishedSession\.lightingMode/);
 assert.match(main,/renderLightingMood2D\(\);renderWeaponLights2D\(\)/);
 assert.match(main,/state\.started\|\|state\.phase!=='planning'/);
 assert.match(iso,/this\.sun\.intensity=mood\.sun/);
});
