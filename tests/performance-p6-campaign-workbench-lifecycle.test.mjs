/** P6: keep one Campaign weapon bench renderer across HTML-only edits. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const code=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');

test('Campaign armory keeps workbench context while refreshing same operator',()=>{
 assert.match(code,/const retainWorkbench=this\.weaponView&&!!this\.workbench/);
 assert.match(code,/if\(!retainOperatorPreview&&!retainWorkbench\)this\.disposePreview\(\)/);
 assert.match(code,/this\.workbench\.attachHost\(preview,onSocket\)/);
 assert.match(code,/const visualKey=JSON\.stringify\(person\.weaponConfiguration\)/);
 assert.match(code,/const refreshGeometry=!this\.workbench\|\|!sameOperator\|\|/);
 assert.match(code,/this\.workbenchVisualKey!==visualKey/);
 assert.match(code,/if\(refreshGeometry\)this\.workbench\.setConfiguration\(person\.weaponConfiguration\)/);
 assert.match(code,/this\.workbenchCore=core;this\.workbenchVisualKey=visualKey/);
});

test('weapon geometry and orbit change only on real edits or operator switches',()=>{
 assert.match(code,/if\(retainWorkbench&&!sameOperator&&this\.lastArmoryRenderedId&&this\.workbenchCore\)/);
 assert.match(code,/this\.weaponWorkbenchViews\.set\(this\.lastArmoryRenderedId,/);
 assert.match(code,/if\(refreshGeometry&&sameOperator&&this\.workbenchCore===core\)/);
 assert.match(code,/if\(refreshGeometry&&savedView\?\.core===core\)/);
 assert.match(code,/this\.workbenchCore=null;this\.workbenchVisualKey=null/);
});

test('Campaign remains purchase-authoritative and rebinds latest attachment selects',()=>{
 assert.match(code,/const onSocket=\(socket:WorkbenchSocket\)=>\{/);
 assert.match(code,/mountSelectors\.get\(socket as WeaponAttachmentSlot\)/);
 assert.match(code,/this\.workbench\?\.showSocketChoices\(socket,select\)/);
 assert.match(code,/this\.handlers\.equipAttachment\(id,slot,partId,acquire\)/);
 assert.match(code,/this\.handlers\.equipCarryGear\(id,carrySlot,itemId\)/);
});
