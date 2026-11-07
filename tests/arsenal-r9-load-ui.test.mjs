import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Operator Workbench loads personal recipes through an explicit whole-build review',()=>{
 const wb=source('src/arsenal/workbench-screen.ts');
 for(const token of ['LOAD BUILD','proposeArsenalRecipeLoad','acceptArsenalRecipeLoad',
  'LOAD INTO EDITOR','selectedRecipeLoad','arsenalRecipeDifferenceLabel',
  "savedId=null","SAVED RECIPE LOADED · NOT EQUIPPED"])
  assert.ok(wb.includes(token),token);
 assert.ok(wb.includes("loadDialog.showModal()"));
 assert.ok(wb.includes("loadDialog.close()"));
});
test('Quick Play class changes disclose magazine reset and require confirmation',()=>{
 const wb=source('src/arsenal/workbench-screen.ts');
 const main=source('src/breach-main.ts');
 assert.match(main,/quoteQuickPlayArsenalEdit/);
 assert.match(wb,/checked\?\.changesClass/);
 assert.match(wb,/replaces the loaded and spare magazines/);
});
