import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {contextActionChoices} from '../src/ui/context-actions.ts';
import {resolveTacticalIconId,tacticalIconForState,FIELDWORK_ICON_FAMILY}
  from '../src/ui/tactical-icons.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const base={door:false,node:true,flashRemaining:2,
  posture:'stand',pace:'walk',firePolicy:'engage',reserve:30,magazine:20};

test('all authoritative contextual action IDs have semantic icons, never focus fallback',()=>{
 const content=read('src/ui/context-actions.ts');
 const actionIds=[...new Set([...content.matchAll(/\bid:'(ctx[^']+)'/g)]
   .map(match=>match[1]))].filter(id=>id!=='ctxTool-');
 assert.ok(actionIds.length>=35,'audit must cover the real action catalog');
 for(const id of actionIds){
  const resolved=resolveTacticalIconId(id);
  assert.ok(resolved,'unmapped action '+id);
  assert.notEqual(resolved,'focus','generic glyph for '+id);
  assert.match(FIELDWORK_ICON_FAMILY[resolved].markup,/<(?:path|circle|rect|g)\b/);
 }
 for(const tool of ['pick','pry','cut','wedge','unwedge','breach','ram'])
  assert.ok(resolveTacticalIconId('ctxTool-'+tool),'door tool '+tool);
 for(const state of ['on','off'])
  assert.equal(resolveTacticalIconId('ctxPower:'+state+':switch:1'),'power');
 assert.equal(resolveTacticalIconId('ctxTool-unknown'),null);
 assert.equal(resolveTacticalIconId('ctxUnknownCommand'),null);
});

test('contextual names describe commands; state labels reflect current policy',()=>{
 const options={...base,
  nearCivilian:true,nearSuspect:true,nearRestrainableSuspect:true,
  nearRestrainableCivilian:true,nearSearchableSuspect:true,
  nearDroppedFirearm:true,nearEscortableSuspect:true,
  nearFollowingSuspect:true,escortableCivilian:true,
  stopFollowingCivilian:true,carryingCivilian:true,
  carryingCaptureTarget:true,nearWindow:true,nearWindowOpen:true,
  nearDownedCaptureTarget:true,nearCivilianCasualty:true,
  secondaryIssued:true,secondaryHand:'secondary'};
 const actions=contextActionChoices(options);
 const name=id=>actions.find(a=>a.id===id)?.label;
 assert.equal(name('ctxSecureCivilian'),'REASSURE');
 assert.equal(name('ctxDoor'),undefined);
 assert.equal(name('ctxRestrainSuspect'),'RESTRAIN SUSPECT');
 assert.equal(name('ctxRestrainCivilian'),'RESTRAIN');
 assert.equal(name('ctxSecureFirearm'),'SECURE WEAPON');
 assert.equal(name('ctxEscortSuspect'),'FOLLOW SUSPECT');
 assert.equal(name('ctxFollowCivilian'),'FOLLOW CIVILIAN');
 assert.equal(name('ctxStopEscortSuspect'),'SUSPECT STAY');
 assert.equal(name('ctxStopFollowingCivilian'),'CIVILIAN STAY');
 assert.equal(name('ctxReleaseCivilian'),'SET DOWN');
 assert.equal(name('ctxReleaseCapture'),'SET DOWN TARGET');
 assert.equal(name('ctxDragCapture'),'DRAG TARGET');
 assert.equal(name('ctxCarryCapture'),'CARRY TARGET');
 assert.equal(name('ctxSwitchWeapon'),'SWITCH TO PRIMARY');
 assert.equal(name('ctxWindow'),'CLOSE WINDOW');
 assert.equal(name('ctxDelete'),'DELETE POINT');
 assert.equal(contextActionChoices({...base,firePolicy:'hold'})
  .find(a=>a.id==='ctxFire')?.label,'HOLD FIRE');
 assert.equal(contextActionChoices({...base,firePolicy:'return'})
  .find(a=>a.id==='ctxFire')?.label,'RETURN FIRE');
 assert.equal(tacticalIconForState('ctxWindow','CLOSE WINDOW'),'ctxWindowClose');
 assert.equal(tacticalIconForState('ctxWindow','OPEN WINDOW'),'ctxWindowOpen');
 const solo=contextActionChoices({...base,escortableCivilian:true,
  stopFollowingCivilian:true});
 assert.equal(solo.find(a=>a.id==='ctxFollowCivilian')?.label,'FOLLOW ME');
 assert.equal(solo.find(a=>a.id==='ctxStopFollowingCivilian')?.label,'STAY HERE');
 const door=contextActionChoices({...base,door:true,
  availableTools:['pick','breach','unwedge']});
 assert.equal(door.find(a=>a.id==='ctxTool-pick')?.label,'PICK LOCK');
 assert.equal(door.find(a=>a.id==='ctxTool-breach')?.label,'BREACH DOOR');
 const trigger=contextActionChoices({...base,nearDoor:true});
 assert.equal(trigger.find(a=>a.id==='ctxDoor')?.label,'DOOR ACTIONS');
});

test('the 22 new icons use the existing bold simplified glyph family',()=>{
 const names=['doorActions','verbal','restrain','searchPerson','secureWeapon',
  'reassure','follow','stay','dragPerson','carryPerson','setDown',
  'switchWeapon','pickLock','pryTool','cutTool','wedgeTool',
  'removeWedge','breachTool','power','windowOpen','windowClose','inspect'];
 for(const key of names){
  const glyph=FIELDWORK_ICON_FAMILY[key];
  assert.ok(glyph,key);
  assert.equal(glyph.viewBox,'0 0 48 48');
  assert.ok(glyph.strokeWidth>=2.4,key+' must survive small icons');
  assert.ok(glyph.markup.length>50,key+' must have drawable geometry');
 }
 assert.equal(resolveTacticalIconId('replayMore'),null,
  'view button decorates the dedicated inspect glyph directly');
});

test('cross-screen wording and touch targets are explicit and accessible',()=>{
 const q=read('src/ui/quick-play-configurator.ts');
 assert.match(q,/GENERATE RANDOM/);
 assert.match(q,/RANDOM SEED/);
 assert.match(q,/Generate a random mission now/);
 assert.match(read('src/ui/breach-photo-ui.ts'),/HIDE HUD/);
 assert.match(read('src/breach-photo-mode-controller.ts'),/SHOW HUD/);
 assert.match(read('src/ui/breach-replay-library-ui.ts'),/CONFIRM DELETE/);
 const forensic=read('src/ui/breach-after-action-combat.ts');
 assert.match(forensic,/Previous recorded shot/);
 assert.match(forensic,/Next recorded shot/);
 const timeline=read('src/ui/breach-after-action-timeline.ts');
 assert.match(timeline,/VIEW MOMENTS/);
 const mobile=read('src/breach-style.css');
 assert.match(mobile,/min-height:44px!important/);
 assert.match(mobile,/\.context-tools \.context-primary \.command-label/);
});
