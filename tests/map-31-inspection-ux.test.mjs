import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Asset Lab supports review filters, scaled camera and contextual live models',()=>{
 const html=f('asset-lab.html'),code=f('src/asset-lab-main.ts');
 for(const name of ['review-status','scale-reference','context'])assert.ok(html.includes('id="'+name+'"'));
 assert.ok(code.includes('const companion:Record<string,string>'));
 assert.ok(code.includes('Math.sqrt(48/Math.max'));
 assert.ok(code.includes('scaleGuides.visible=scaleReferenceShown'));
});