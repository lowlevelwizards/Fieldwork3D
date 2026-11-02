import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
test('major tactical panels use a single collapse path',()=>{
 assert.match(main,/function collapseTacticalSheets\(except:/);
 for(const name of ["squad","weapon","settings","tools","briefing"])
  assert.ok(main.includes("'"+name+"'"),'Missing panel type: '+name);
 assert.match(main,/if\(except!=='squad'\)operationsBoard\.hidden=true/);
 assert.match(main,/if\(except!=='weapon'\)hideWeaponChooser\(\)/);
 assert.match(main,/if\(except!=='settings'\)/);
 assert.match(main,/if\(except!=='tools'\)/);
 assert.match(main,/collapseTacticalSheets\(opening\?'squad':null\)/);
 assert.match(main,/collapseTacticalSheets\(opening\?'settings':null\)/);
 assert.match(main,/collapseTacticalSheets\(expanded\?'tools':null\)/);
});
