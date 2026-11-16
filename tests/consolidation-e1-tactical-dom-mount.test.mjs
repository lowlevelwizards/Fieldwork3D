/** E1.N: stable tactical UI mounts avoid repeated querySelector calls. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const hud=readFileSync(new URL('../src/ui/tactical-hud-controller.ts',import.meta.url),'utf8');
test('E1.N caches connected tactical DOM nodes, retries missing/remounted nodes',()=>{
 assert.match(hud,/current\?\.isConnected\?current:document\.querySelector<T>\(selector\)/);
 for(const name of ['rangeExit','rangeRepeat','siteHeader','siteSubheading'])
  assert.match(hud,new RegExp(name+'=mounted\\('));
 for(const selector of [
  '[data-equipment-range-exit]','[data-range-repeat]','.ident strong','.ident small'
 ])assert.ok(hud.includes(selector),selector);
 assert.doesNotMatch(hud,/const siteHeader=document\.querySelector/);
 assert.doesNotMatch(hud,/const repeat=document\.querySelector/);
});
