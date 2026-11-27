import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

{
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('Campaign armory records carry transactions and passes undo to final owner',()=>{
 const s=read('campaign-ui.ts'),flow=read('breach-campaign-flow.ts');
 assert.match(s,/private readonly carryUndo=new CarryKitUndoHistory\(\)/);
 assert.match(s,/this\.carryUndo\.record\(id,captureCarryUndo/);
 assert.match(s,/UNDO LAST CARRY MOVE/);
 assert.match(s,/this\.handlers\.undoCarryGear\(id,expected,undo.restore\)/);
 assert.match(flow,/undoCampaignCarryGear\(c,id,expected,before,config\.carryMode\)/);
});
}

{
const s=readFileSync(new URL('../src/ui/field-gadget-editor.ts',import.meta.url),'utf8');
test('physical layout copy is previewed before applying and never calls gadget issue',()=>{
 assert.match(s,/onCopyLayout\?:\(targetId:string\)=>void/);
 assert.match(s,/PREVIEW CARRY LAYOUT/);
 assert.match(s,/COPY GADGETS/);
 assert.match(s,/quoteCarryLayoutCopy\(loadout,magazines,target.loadout,target.magazines\)/);
 assert.match(s,/confirm.hidden=true;options.onCopyLayout\?\.\(target.id\)/);
 assert.match(s,/TARGET CHANGED · PREVIEW AGAIN/);
});
}

{
const read=name=>readFileSync(new URL('../src/'+name,import.meta.url),'utf8');
test('physical layout copies use distinct authorized Campaign and roster commit callbacks',()=>{
 const ops=read('breach-operations-board-controller.ts');
 const camp=read('campaign-ui.ts');
 const flow=read('breach-campaign-flow.ts');
 assert.match(ops,/onCopyLayout:targetId=>/);
 assert.match(ops,/copyRosterCarryLayout\(before,current\.id,targetId,config\.carryMode\)/);
 assert.match(camp,/onCopyLayout:targetId=>/);
 assert.match(camp,/this.handlers.copyCarryLayout\(id,targetId\)/);
 assert.match(flow,/copyCampaignCarryLayout\(c,sourceId,targetId,config\.carryMode\)/);
});
}

{
const read=path=>readFileSync(new URL('../src/'+path,import.meta.url),'utf8');

test('Campaign and both Quick Play entry points use shared carry quote and atomic owners',()=>{
 const ops=read('breach-operations-board-controller.ts');
 const campaign=read('campaign-ui.ts');
 const gallery=read('ui/campaign-outfitter-gallery.ts');
 const config=read('ui/quick-play-configurator.ts');
 const flow=read('breach-campaign-flow.ts');
 assert.match(gallery,/quoteCarryGearChange\(/);
 assert.match(gallery,/tile\.disabled=!choice\.issued/);
 assert.match(ops,/equipmentWorkspace\.mountGallery\(member\.id,\{/);
 assert.match(config,/equipmentWorkspace\.mountGallery\(selected\.id,\{/);
 assert.match(ops,/equipRosterCarryGear\(before,member\.id,slot,itemId,config\.carryMode\)/);
 assert.match(ops,/carryUndo\.record\(member\.id,/);
 assert.match(ops,/captureCarryUndo\(old\.loadout,old\.magazines\)/);
 assert.doesNotMatch(ops,/attachCarryGearChangePreview\(/,
  'Quick Play Squad must not construct another legacy gear picker');
 assert.match(campaign,/attachCarryGearChangePreview\(/);
 assert.match(campaign,/this\.handlers\.equipCarryGear\(id,slot,itemId\)/);
 assert.match(flow,/equipCampaignCarryGear\(c,id,slot,itemId,config\.carryMode\)/);
});
}

{
test('operations physical undo is one-shot and final authority validates current kit',()=>{
 const s=readFileSync(new URL('../src/breach-operations-board-controller.ts',import.meta.url),'utf8');
 assert.match(s,/new CarryKitUndoHistory\(\)/);
 assert.match(s,/UNDO LAST CARRY MOVE/);
 assert.match(s,/undoRosterCarryGear\(old,member\.id,expected,undo\.restore,config\.carryMode\)/);
 assert.match(s,/carryUndo\.clear\(member.id\)/);
 assert.match(s,/carryUndo\.record\(member.id,/);
 assert.match(s,/carryUndo\.record\(current.id,/);
});
}
