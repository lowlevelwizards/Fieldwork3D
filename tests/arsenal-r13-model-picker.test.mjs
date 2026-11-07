import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
test('Workbench offers a contextual factory browser without returning to classic sockets',()=>{
 const code=src('src/arsenal/workbench-screen.ts');
 for(const token of ['CHOOSE MODEL','arsenalFactoryChoices','modelPlatform',
  'modelSearch',"openRecipePicker('model')",'USE AS STARTING POINT',
  'FACTORY MODEL SELECTED · NOT EQUIPPED'])
  assert.ok(code.includes(token),token);
 assert.match(code,/arsenalFactoryChoices\(modelPlatform\.value/);
 assert.match(code,/proposeArsenalRecipeLoad\(draft\.working,build\.recipe\)/);
 assert.match(code,/acceptArsenalRecipeLoad\(draft,selectedRecipeLoad\)/);
});
test('factory switches preserve explicit Campaign/Quick Play quote and approval gate',()=>{
 const code=src('src/arsenal/workbench-screen.ts');
 assert.match(code,/context\?\.quote\?\.\(build\.recipe\)/);
 assert.match(code,/checked\?\.changesClass/);
 assert.match(code,/loadMode==='model'/);
 assert.match(code,/savedId=null/);
});
