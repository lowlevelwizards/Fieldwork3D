import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');

test('per-operator route palette also reaches squad buttons and selected command controls',()=>{
  for(const [id,color] of Object.entries({
    rook:'#a2d4ca',moss:'#b9c6a0',ash:'#dfb992',vale:'#b7b1d9'
  })){
    assert.ok(main.includes(id+":'"+color+"'"),id+' retains its assigned color');
  }
  assert.match(main,/paintOperatorAccent\(button,id\)/);
  assert.match(main,/paintOperatorAccent\(ui\.quickStates,selected\)/);
  assert.match(main,/paintOperatorAccent\(ui\.context,selected\)/);
  assert.match(main,/paintOperatorAccent\(contextTether,selected\)/);
});
test('squad selection and tactical control accents use the operator variable',()=>{
  assert.match(css,/\.bar \.unit strong\{color:var\(--operator-accent\)\}/);
  assert.match(css,/\.bar \.unit\.selected\{[\s\S]*?border-color:var\(--operator-accent\)/);
  assert.match(css,/\.quick-states button\[aria-pressed=true\]\{[\s\S]*?border-color:var\(--operator-accent\)/);
  assert.match(css,/\.context-tools \.context-primary button\[aria-pressed=true\]\{[\s\S]*?border-color:var\(--operator-accent\)/);
  // These must remain separate from faction identity colors.
  assert.match(css,/--health-color/);
});
