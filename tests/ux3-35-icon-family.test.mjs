import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FIELDWORK_ICON_FAMILY,tacticalIcon,tacticalIconForState} from '../src/ui/tactical-icons.ts';
import {contextActionChoices} from '../src/ui/context-actions.ts';

const chosen=[
 'go','pause','engage','holdFire','returnFire','suppress','flash','reload',
 'wait','cancelTarget','walk','run','stand','crouch','look','watch',
 'releaseWatch','deletePoint','clearPlan','undo','redo','openDoor',
 'closeDoor','kick','push','window','settings','fitView','briefing',
 'restart','watchReplay','previousEvent','rewind','fastForward','nextEvent'
];

test('35 approved vector concepts are registered with visible, valid SVG geometry',()=>{
 assert.equal(chosen.length,35);
 assert.equal(new Set(chosen).size,35);
 for(const key of chosen){
  const glyph=FIELDWORK_ICON_FAMILY[key];
  assert.ok(glyph,key+' must exist');
  assert.ok(glyph.viewBox.startsWith('0 0 '),key+' must retain viewBox');
  assert.match(glyph.markup,/<(?:path|rect|circle|g)\b/,key+' must contain geometry');
  assert.ok(Number.isFinite(glyph.strokeWidth)&&glyph.strokeWidth>1,key);
 }
});

test('context states map to the correct human-sized selected symbols',()=>{
 assert.equal(tacticalIconForState('ctxFire','ENGAGE'),'ctxFire');
 assert.equal(tacticalIconForState('ctxFire','HOLD'),'ctxFireHold');
 assert.equal(tacticalIconForState('ctxFire','RETURN'),'ctxFireReturn');
 assert.equal(tacticalIconForState('ctxPace','WALK'),'ctxPaceWalk');
 assert.equal(tacticalIconForState('ctxPace','RUN'),'ctxPace');
 assert.equal(tacticalIconForState('ctxStance','STAND'),'ctxStance');
 assert.equal(tacticalIconForState('ctxStance','CROUCH'),'ctxStanceCrouch');
});

test('all on-screen contextual action icons use chosen artwork, not legacy placeholders',()=>{
 const attrs={};
 const oldDoc=globalThis.document;
 try{
  globalThis.document={createElementNS:()=>({
   setAttribute(k,v){attrs[k]=v;},classList:{add(){}},innerHTML:''
  })};
  for(const [key,expected] of [
   ['ctxKick','kick'],['ctxFlash','flash'],['ctxDoorFlash','flash'],
   ['ctxSuppress','suppress'],['ctxWindow','window'],['ctxPush','push'],
   ['ctxReleaseWatch','releaseWatch'],['siteSettingsToggle','settings'],
   ['reset','restart'],['ctxFireHold','holdFire'],['ctxFireReturn','returnFire']
  ]){
   const svg=tacticalIcon(key);
   assert.equal(svg.innerHTML,FIELDWORK_ICON_FAMILY[expected].markup,key);
   assert.equal(attrs.width,'24',key);
   assert.equal(attrs.height,'24',key);
   assert.equal(attrs.stroke,'currentColor',key);
  }
 }finally{
  if(oldDoc===undefined)delete globalThis.document;
  else globalThis.document=oldDoc;
 }
});

test('retired HOLD DOOR, PIE, and STRAFE do not appear as selectable actions',()=>{
 const opts={door:true,node:false,flashRemaining:2,posture:'stand',pace:'walk',
  firePolicy:'engage',reserve:24,magazine:12,doorOpen:false};
 const door=contextActionChoices(opts);
 assert.ok(door.some(a=>a.id==='ctxOpen'));
 assert.ok(door.some(a=>a.id==='ctxKick'));
 assert.ok(!door.some(a=>a.id==='ctxHold'));
 const move=contextActionChoices({...opts,door:false});
 for(const obsolete of ['ctxHold','ctxPie','ctxStrafe','ctxStrafeMove'])
  assert.ok(!move.some(a=>a.id===obsolete),obsolete);
});

test('existing HUD and replay actions are wired to the icon registry',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 assert.match(main,/tacticalIcon\(playbackIcon\)/);
 assert.match(main,/\['replayBack','rewind'\]/);
 assert.match(main,/\['replayPrevEvent','previousEvent'\]/);
 assert.match(main,/\['watchReplay','watchReplay'\]/);
 assert.doesNotMatch(main,/case 'ctxHold'/);
});
