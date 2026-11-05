import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compactExecutionStatus} from '../src/ui/tactical-hud-density.ts';
import {QUICK_LOADOUT_GROUPS,loadoutGroupForSlot} from '../src/ui/quick-loadout-groups.ts';
import {LOADOUT_SLOTS} from '../src/equipment-catalog.ts';

const src=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const event=(kind,label,detail='')=>({
 kind,label,detail,orderId:null,reason:kind
});
test('quiet HUD trims routine nonselected status without hiding critical state',()=>{
 const idle=event('idle','IDLE','NO ACTIVE ORDERS');
 assert.deepEqual(compactExecutionStatus(idle,{selected:false,phase:'planning',down:false}),
  {visible:false,label:'',detail:'NO ACTIVE ORDERS',priority:'quiet'});
 assert.deepEqual(compactExecutionStatus(idle,{selected:true,phase:'planning',down:false}),
  {visible:true,label:'READY',detail:'NO ACTIVE ORDERS',priority:'quiet'});
 const moving=compactExecutionStatus(event('moving','MOVING','TO WAYPOINT'),
  {selected:false,phase:'execution',down:false});
 assert.equal(moving.visible,false);
 assert.equal(compactExecutionStatus(event('waiting','WAITING','DOOR OPENING'),
  {selected:false,phase:'execution',down:false}).visible,true);
 const warning=compactExecutionStatus(event('blocked','DOOR BLOCKED','DOOR JAMMED'),
  {selected:false,phase:'execution',down:false});
 assert.equal(warning.visible,true);
 assert.equal(warning.priority,'attention');
 assert.equal(warning.detail,'DOOR JAMMED');
 assert.equal(compactExecutionStatus(event('planned','PLANNED','MOVE'),
  {selected:false,phase:'planning',down:false}).visible,true);
 assert.equal(compactExecutionStatus(event('working','RELOAD','IN PROGRESS'),
  {selected:false,phase:'execution',down:true}).visible,false);
});
test('battlefield retains four cards, health, ammunition, gameplay and aria detail',()=>{
 const main=src('src/breach-main.ts'),style=src('src/ui/ux-r3-hud.css'),
  html=src('index.html');
 assert.match(main,/compactExecutionStatus\(execution,/);
 assert.match(main,/stateLine\.hidden=!status\.visible/);
 assert.match(main,/button\.dataset\.executionVisible=String\(status\.visible\)/);
 assert.match(main,/button\.setAttribute\('aria-label',a\?/);
 assert.match(main,/stateLine\.title=status\.detail/);
 assert.match(main,/a\.magazine\)\.padStart/);
 assert.match(main,/button\.style\.setProperty\('--health-fill'/);
 for(const id of ['rook','moss','ash','vale']){
  assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,new RegExp('id="'+id+'Hp"'));
  assert.match(html,new RegExp('id="'+id+'Ammo"'));
 }
 assert.match(style,/data-execution-visible="true"/);
 assert.match(style,/\.unit-execution\[hidden\]/);
 assert.match(style,/--fw-focus/);
 assert.match(main,/ui\.play\.classList\.toggle\('running'/);
});
test('Quick Play restoration removes nested cosmetic editor but preserves loadout',()=>{
 const main=src('src/breach-main.ts');
 assert.match(main,/createTacticalSheetNavigation\(/);
 assert.match(main,/tacticalSheetNavigation\.sync\(\)/);
 assert.match(main,/buildQuickLoadoutGroups\(kit,/);
 assert.match(main,/openOperatorStudio\(member\.id,'quick'\)/);
 assert.match(main,/promptFieldworkText\(/);
 assert.doesNotMatch(main,/createWardrobeFabricCamoPicker\(/);
 assert.doesNotMatch(main,/createHeadwearAppearancePicker\(/);
 assert.doesNotMatch(main,/window\.prompt\('Operator callsign'/);
 assert.match(main,/moveRosterMagazine\(/);
 assert.match(main,/configureRosterWeapon\(/);
 const css=src('src/ui/ux-r1-sheets.css');
 assert.match(css,/\.fw-squad-sheet/);
 assert.match(main,/import '\.\/ui\/ux-r1-sheets\.css'/);
});
test('Campaign directly offers the canonical Studio and groups full kit',()=>{
 const campaign=src('src/campaign-ui.ts'),
  css=src('src/campaign-style.css');
 assert.match(campaign,/button\('APPEARANCE',\(\)=>this\.handlers\.openStudio\(p\.id\)\)/);
 assert.match(campaign,/button\('APPEARANCE · OPEN STUDIO',\(\)=>this\.handlers\.openStudio\(id\)\)/);
 assert.match(campaign,/const grouped=buildQuickLoadoutGroups\(editor,this\.activeKitGroup/);
 assert.match(campaign,/grouped\.field\(loadoutGroupForSlot\(slot\)\)\.append\(wrap\)/);
 assert.match(campaign,/grouped\.field\('weapon'\)\.append\(attachments\)/);
 assert.match(campaign,/grouped\.field\('carry'\)\.append\(magazines\)/);
 assert.match(campaign,/const readiness=node\('details','campaign-readiness-details'\)/);
 assert.match(campaign,/const presets=node\('details','campaign-kit-presets'\)/);
 assert.doesNotMatch(campaign,/createWardrobeFabricCamoPicker\(/);
 assert.doesNotMatch(campaign,/createHeadwearAppearancePicker\(/);
 assert.match(campaign,/this\.handlers\.equipAttachment\(id,slot,partId,acquire\)/);
 assert.match(campaign,/this\.handlers\.moveMagazine\(/);
 assert.match(campaign,/c\.inventory\.weapons\[weapon\]/);
 assert.match(campaign,/const locked=!!c\.activeContractId/);
 assert.match(css,/\.campaign-person-actions/);
 assert.match(css,/\.campaign-kit-editor \.fw-loadout-group/);
 for(const slot of LOADOUT_SLOTS)assert.ok(QUICK_LOADOUT_GROUPS.some(g=>
  g.id===loadoutGroupForSlot(slot)));
});
