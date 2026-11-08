import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {
  DEFAULT_CONTEXT_LAYOUT,parseContextLayout,bubbleSlots,bubblePlacement,
  BUBBLE_WIDTH,BUBBLE_HEIGHT
} from '../src/ui/context-layout.ts';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');

test('context layout choices default to a quiet dock and accept prior selection',()=>{
  assert.equal(DEFAULT_CONTEXT_LAYOUT,'dock');
  for(const layout of ['dock','bubbles','floating'])
    assert.equal(parseContextLayout(layout),layout);
  assert.equal(parseContextLayout(null),'dock');
  assert.equal(parseContextLayout('broken'),'dock');
  for(const layout of ['dock','bubbles','floating'])
    assert.ok(html.includes('data-context-layout="'+layout+'"'));
  assert.match(main,/localStorage\.setItem\(CONTEXT_LAYOUT_PREF,layout\)/);
});

test('bubble slots remain distinct and clear a center for all common actions',()=>{
  for(let count=1;count<=12;count++){
    const slots=bubbleSlots(count);
    assert.equal(slots.length,count);
    for(const position of slots){
      assert.ok(Number.isFinite(position.x)&&Number.isFinite(position.y));
      assert.ok(Math.hypot(position.x,position.y)>65);
    }
    for(let i=0;i<slots.length;i++)
      for(let j=i+1;j<slots.length;j++)
        assert.ok(Math.hypot(slots[i].x-slots[j].x,
          slots[i].y-slots[j].y)>45,'overlapping bubbles: '+count);
  }
});

test('bubbles clamp inside safe viewport and fall back on narrow or short screens',()=>{
  const base={anchorX:195,anchorY:370,viewportWidth:390,
    top:80,hudTop:680};
  assert.deepEqual(bubblePlacement(base),{
    x:195-BUBBLE_WIDTH/2,y:370-BUBBLE_HEIGHT/2});
  assert.equal(bubblePlacement({...base,viewportWidth:320}),null);
  assert.equal(bubblePlacement({...base,hudTop:335}),null);
  assert.equal(bubblePlacement({...base,anchorX:-100}),null);
  const edge=bubblePlacement({...base,anchorX:20,anchorY:600});
  assert.ok(edge);
  assert.ok(edge.x>=8&&edge.y>=base.top);
  assert.ok(edge.x+BUBBLE_WIDTH<=base.viewportWidth-8);
  assert.ok(edge.y+BUBBLE_HEIGHT<=base.hudTop-8);
});

test('dock and bubbles share the real action handler without map interception',()=>{
  assert.match(main,/ui\.tacticalHud\.insertBefore\(ui\.context,ui\.quickStates\)/);
  assert.match(main,/const destination=effectiveLayout==='floating'\?/);
  assert.match(main,/ui\.context\.style\.pointerEvents=effectiveLayout==='bubbles'\?'none':'auto'/);
  assert.match(main,/const handleContextAction=\(event:MouseEvent\)=>/);
  assert.match(css,/\.context-tools\[data-layout="dock"\]/);
  assert.match(css,/\.context-tools\[data-layout="bubbles"\]/);
  assert.match(css,/\.context-tools\[data-layout="bubbles"\] \.context-primary button/);
});
