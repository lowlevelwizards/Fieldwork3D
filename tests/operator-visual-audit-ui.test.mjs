import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
test('operator lab exposes rear and gameplay distance viewing and render counts',()=>{
 const html=readFileSync(new URL('../operator-lab.html',import.meta.url),'utf8');
 const lab=readFileSync(new URL('../src/breach-operator-lab.ts',import.meta.url),'utf8');
 assert.match(html,/data-view="back"/);assert.match(html,/data-view="game"/);
 assert.match(html,/id="visualStats"/);
 assert.match(lab,/next==='back'\?-75/);
 assert.match(lab,/next==='game'\?\.65/);
 assert.match(lab,/renderer\.info\.render\.triangles/);
});
