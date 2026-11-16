/** E1.M — persistent Workbench navigation and selected-state contract. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../src/arsenal/workbench-screen.ts',import.meta.url),'utf8');
test('Workbench mounts category/subslot buttons once and updates selected states',()=>{
 const nav=code.slice(code.indexOf('const categoryButtons='),code.indexOf('function renderSelection(){'));
 assert.match(nav,/if\(!categoryButtons\.size\)/);
 assert.match(nav,/categoryButtons\.set\(category\.id,button\);nav\.append\(button\)/);
 assert.match(nav,/if\(mountedSlotCategory!==activeCategory\.id\)/);
 assert.match(nav,/slotButtons\.clear\(\)/);
 assert.match(nav,/slotRow\.replaceChildren\(\)/);
 assert.match(nav,/if\(button\.getAttribute\('aria-pressed'\)!==pressed\)/);
 assert.match(nav,/activeCategory=category;activeSlot=category\.slots\[0\];pending=null/);
 assert.match(nav,/activeSlot=slot;pending=null;renderSelection\(\)/);
 const refresh=code.slice(code.indexOf('function renderSelection(){'),code.indexOf('const loadDialog=',code.indexOf('function renderSelection(){')));
 assert.match(refresh,/syncNavigation\(\)/);
 assert.doesNotMatch(refresh,/nav\.replaceChildren\(\)|slotRow\.replaceChildren\(\)/);
 assert.match(refresh,/renderChoices\(\);renderPending\(\)/);
 assert.match(refresh,/viewer\.setSelectedSlot\(activeSlot\)/);
});
