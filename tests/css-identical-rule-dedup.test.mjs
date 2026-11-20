import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('Glock mobile aspect-ratio override appears once with the same value',()=>{
 const css=read('arsenal/arsenal.css');
 const block=css.match(/@media\(max-width:720px\)\{\s*\.arsenal-glock-hero-visual\[data-view="family"\]\{aspect-ratio:4\/3\}/g)??[];
 assert.equal(block.length,1);
 assert.match(css,/\.arsenal-glock-hero-visual\[data-view="family"\]\{\s*position:relative;aspect-ratio:4\/3/);
});

test('physical carry copy-button disabled opacity keeps one authored rule',()=>{
 const css=read('ui/loadout-prep.css');
 assert.equal((css.match(/\.fw-field-inventory-copy-area button:disabled\{opacity:\.4\}/g)??[]).length,1);
});
