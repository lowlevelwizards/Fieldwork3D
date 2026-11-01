import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const f=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('appliances and plumbing have functional attachments',()=>{
 const a=f('src/worldgen/asset-character-visuals.ts'),d=f('src/worldgen/detailed-fixture-visuals.ts'),s=f('src/worldgen/fixture-visuals.ts');
 for(const text of ['oven door pull','microwave handle','soap tray'])assert.ok(a.includes(text));
 for(const text of ['keyboard key bed','paper feed guides','physical keypad rows'])assert.ok(d.includes(text));
 assert.ok(s.includes('bath lip'));assert.ok(s.includes('tap riser'));
});