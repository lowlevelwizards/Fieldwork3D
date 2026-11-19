import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../src/ui/field-gadget-editor.ts',import.meta.url),'utf8');
test('physical layout copy is previewed before applying and never calls gadget issue',()=>{
 assert.match(s,/onCopyLayout\?:\(targetId:string\)=>void/);
 assert.match(s,/PREVIEW CARRY LAYOUT/);
 assert.match(s,/COPY GADGETS/);
 assert.match(s,/quoteCarryLayoutCopy\(loadout,magazines,target.loadout,target.magazines\)/);
 assert.match(s,/confirm.hidden=true;options.onCopyLayout\?\.\(target.id\)/);
 assert.match(s,/TARGET CHANGED · PREVIEW AGAIN/);
});
