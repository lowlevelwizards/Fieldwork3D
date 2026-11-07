import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const get=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Arsenal CSS cannot reset the Campaign and tactical page globally',()=>{
 const css=get('src/arsenal/arsenal.css');
 assert.doesNotMatch(css,/^:root\{color-scheme:dark\}/m);
 assert.doesNotMatch(css,/^\*\{box-sizing:border-box\}/m);
 assert.doesNotMatch(css,/^html,body\{/m);
 assert.doesNotMatch(css,/^button,input,a\{/m);
 assert.doesNotMatch(css,/^a\{color:inherit/m);
 assert.match(css,/body\.arsenal-standalone/);
 assert.match(get('arsenal.html'),/<body class="arsenal-standalone">/);
});
test('mobile Workbench groups primary and utility actions without hiding them',()=>{
 const css=get('src/arsenal/arsenal.css');
 const source=get('src/arsenal/workbench-screen.ts');
 assert.match(css,/\.arsenal-wb-primary-actions\{display:grid;/);
 assert.match(css,/grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
 assert.match(css,/\.arsenal-wb-utility-actions\{display:flex/);
 assert.match(source,/primaryActions\.append\(chooseModel,load,save,apply\)/);
 assert.match(source,/utilityActions\.append\(undo,redo,saveCopy,fit,side\)/);
 assert.match(source,/document\.body\.style\.overflow=priorBodyOverflow/);
});
