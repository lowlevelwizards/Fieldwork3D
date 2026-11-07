import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {remapArsenalZoom} from '../src/arsenal/camera-state.ts';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('changing a long rifle for a compact gun restores its visual scale',()=>{
 assert.equal(remapArsenalZoom(90,90,35),35);
 assert.equal(remapArsenalZoom(35,35,90),90);
 assert.equal(remapArsenalZoom(80,120,40),60);
 assert.equal(remapArsenalZoom(80,2000,40),100,'bounded zoom');
 assert.equal(remapArsenalZoom(80,1,40),26,'intentional close zoom clamped');
});
test('viewport fits actual new geometry without reallocating WebGL buffer on orbit',()=>{
 const viewport=src('src/arsenal/viewport.ts');
 assert.match(viewport,/remapArsenalZoom\(oldFit,this\.distance,this\.fitDistance\)/);
 assert.match(viewport,/if\(w!==this\.lastWidth\|\|h!==this\.lastHeight\)/);
});
test('Arsenal has a dedicated first-class entry on the main menu',()=>{
 const menu=src('src/campaign-ui.ts');
 assert.match(menu,/ARSENAL · WEAPON WORKBENCH/);
 assert.match(menu,/\.\/arsenal\.html/);
});
