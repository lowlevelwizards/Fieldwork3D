/** E1.C: identical tactical presentation must not mutate DOM repeatedly. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {writeDomText,writeDomAttribute,writeDomStyle}
 from '../src/ui/tactical-dom-reconciliation.ts';
test('HUD equality guards skip identical text and attribute writes',()=>{
 let textChanges=0,attrChanges=0,styleChanges=0;
 const node={
  _text:'INITIAL',
  get textContent(){return this._text;},
  set textContent(value){this._text=value;textChanges++;},
  attrs:new Map(),
  getAttribute(key){return this.attrs.get(key)??null;},
  setAttribute(key,value){this.attrs.set(key,value);attrChanges++;},
  style:{
   values:new Map(),
   getPropertyValue(key){return this.values.get(key)??'';},
   setProperty(key,value){this.values.set(key,value);styleChanges++;}
  }
 };
 writeDomText(node,'HEAVY');writeDomText(node,'HEAVY');
 writeDomAttribute(node,'aria-label','heavy');writeDomAttribute(node,'aria-label','heavy');
 writeDomStyle(node,'--health-fill','34%');writeDomStyle(node,'--health-fill','34%');
 assert.deepEqual([textChanges,attrChanges,styleChanges],[1,1,1]);
 writeDomText(node,'DOWN');writeDomAttribute(node,'aria-label','down');
 writeDomStyle(node,'--health-fill','0%');
 assert.deepEqual([textChanges,attrChanges,styleChanges],[2,2,2]);
});
test('HUD reuses one per-refresh friendly roster and does not alter the fixed refresh clock',()=>{
 const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
 const runtime=readFileSync(new URL('../src/breach-runtime-loop.ts',import.meta.url),'utf8');
 const start=hud.indexOf('function renderSession(');
 const end=hud.indexOf('let weaponChooserBound=false;',start);
 assert.ok(start>=0&&end>start);
 const render=hud.slice(start,end);
 assert.equal((render.match(/team\(state\)/g)||[]).length,1);
 assert.match(render,/peers:friendly/);
 assert.match(render,/writeDomText\(ui\.mission/);
 assert.match(hud,/peers:input\.peers/);
 assert.match(runtime,/state\.phase==='running'\?180:terminalHud\?750:120/);
});
