import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../src/'+p,import.meta.url),'utf8');

test('Campaign and outfitter UIs use one inert element/button factory',()=>{
 const common=read('ui/dom-elements.ts');
 assert.match(common,/export function uiNode/);
 assert.match(common,/export function uiButton/);
 assert.match(common,/document\.createElement\(tag\)/);
 assert.match(common,/button\.type='button'/);
 assert.match(common,/button\.addEventListener\('click',onClick\)/);
 const cases=[
  ['campaign-ui.ts',/uiNode as node,uiButton as button/],
  ['ui/quick-play-configurator.ts',/uiNode as node,uiButton as command/],
  ['ui/campaign-outfitter-gallery.ts',/uiNode as el,uiButton as action/]
 ];
 for(const [path,required] of cases){
  const text=read(path);
  assert.match(text,required);
  assert.doesNotMatch(text,/const (node|el|action|button)=<K extends keyof HTMLElementTagNameMap>/);
  assert.doesNotMatch(text,/function node<K extends keyof HTMLElementTagNameMap>/);
 }
});
