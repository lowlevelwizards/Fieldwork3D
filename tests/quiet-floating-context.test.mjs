import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {quietFloatingPocket} from '../src/ui/quiet-floating-pocket.ts';

const baseline=()=>({
  width:224,height:150,viewportWidth:430,top:90,bottom:660,
  protectedRects:[],protectedPaths:[],
});
test('smart floating only chooses narrow peripheral slots',()=>{
  const o=baseline();
  const p=quietFloatingPocket(o);
  assert.ok(p);
  assert.ok(p.x===8||p.x===o.viewportWidth-o.width-8);
  assert.ok(p.y>=o.top&&p.y+o.height<=o.bottom);
});
test('projected operators and meaningful empty-room footprints are hard exclusions',()=>{
  const o=baseline();
  assert.equal(quietFloatingPocket({...o,
    protectedRects:[{x:0,y:0,w:430,h:680}]}),null);
  const p=quietFloatingPocket({...o,
    protectedRects:[{x:0,y:90,w:180,h:570}]});
  assert.ok(p);
  assert.equal(p.x,430-224-8);
});
test('planned movement and watch rays block a floating panel',()=>{
  const o=baseline();
  const leftRay={a:{x:7,y:90},b:{x:7,y:660}};
  const rightRay={a:{x:425,y:90},b:{x:425,y:660}};
  assert.equal(quietFloatingPocket({...o,
    protectedPaths:[leftRay,rightRay]}),null);
  const p=quietFloatingPocket({...o,protectedPaths:[leftRay]});
  assert.ok(p);
  assert.equal(p.x,430-224-8);
});
test('menu stays in the same safe edge pocket until threatened',()=>{
  const o=baseline(),last={x:198,y:210};
  const p=quietFloatingPocket({...o,previous:last});
  assert.ok(p);
  assert.ok(Math.hypot(p.x-last.x,p.y-last.y)<4);
  const moved=quietFloatingPocket({...o,previous:last,
    protectedRects:[{x:300,y:190,w:20,h:100}]});
  assert.ok(moved);
  assert.notDeepEqual(moved,last);
});
test('there is no floating fallback into map space when vertical clearance is absent',()=>{
  const o=baseline();
  assert.equal(quietFloatingPocket({...o,bottom:180}),null);
  assert.equal(quietFloatingPocket({...o,viewportWidth:235}),null);
});
test('live game preserves dock as default and removes bubbles while retaining smart floating',()=>{
  const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
  const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
  const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
  assert.ok(html.includes('data-context-layout="dock"'));
  assert.ok(html.includes('data-context-layout="floating"'));
  assert.ok(!html.includes('data-context-layout="bubbles"'));
  assert.match(main,/quietFloatingPocket\(/);
  assert.match(main,/if\(!quietPocket\)quietReadyAt=0/);
  assert.match(main,/setContextPresentation\('dock'\)/);
  assert.match(main,/contextFingerIds\.size===0/);
  assert.match(css,/\.context-tools\[data-layout="floating"\]/);
});