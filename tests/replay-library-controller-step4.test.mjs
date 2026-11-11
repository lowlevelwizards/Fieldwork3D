import test from 'node:test';
import assert from 'node:assert/strict';
import {createBreachReplayLibraryController}
  from '../src/ui/breach-replay-library-controller.ts';
import {createBreachAppFlow} from '../src/breach-app-flow.ts';
import {readFavoriteMissions} from '../src/breach-mission-favorites.ts';
import {newSession} from '../src/breach-game.ts';
import {captureMissionStart} from '../src/breach-mission-restart.ts';
import {MissionRecorder} from '../src/breach-replay.ts';

class FakeElement extends EventTarget{
  constructor(tag='div'){
    super();this.tag=tag;this.children=[];this.hidden=true;
    this.dataset={};this.textContent='';this.disabled=false;
    this.attributes=new Map();
  }
  append(...children){this.children.push(...children);}
  replaceChildren(...children){this.children=[...children];}
  setAttribute(key,value){this.attributes.set(key,String(value));}
  getAttribute(key){return this.attributes.get(key)??null;}
  click(){this.dispatchEvent(new Event('click'));}
  remove(){}
}
function setup(){
  const documentBefore=globalThis.document;
  const storageBefore=globalThis.localStorage;
  const values=new Map();
  globalThis.document={
    createElement:tag=>new FakeElement(tag),
    createDocumentFragment:()=>new FakeElement('fragment'),
    body:new FakeElement('body')
  };
  globalThis.localStorage={
    getItem:key=>values.get(key)??null,
    setItem:(key,value)=>{values.set(key,value);}
  };
  const keys=['replayLibraryDialog','replayLibraryStatus','replayLibraryList',
    'replayLibraryBackdrop','replayImportButton','replayImportInput',
    'openReplayLibrary','closeReplayLibrary','saveReplayDebrief',
    'replaySaveArchive','favoriteMission','favoriteMissionsList',
    'replayExportJson'];
  const ui=Object.fromEntries(keys.map(key=>[key,new FakeElement()]));
  ui.replayLibraryDialog.hidden=true;
  ui.replayLibraryBackdrop.hidden=true;
  const session=newSession(0,418);
  let recorder=new MissionRecorder();
  recorder.capture(session,true);
  const start=captureMissionStart(session,'medium');
  const help=[],events=[],loadedBookmarks=[];
  let playing=false,playAllowed=true;
  const flow=createBreachAppFlow('menu');
  const controller=createBreachReplayLibraryController({
    ui,
    showUiHelp:(message)=>help.push(message),
    closeMissionSettings:()=>events.push('close-settings'),
    isReplaying:()=>playing,
    getRecorder:()=>recorder,
    setRecorder:value=>{recorder=value;},
    getBookmarks:()=>[],
    applyLoadedBookmarks:marks=>loadedBookmarks.push(...marks),
    enterReplay:()=>{playing=true;events.push('enter-replay');},
    exitReplay:()=>{playing=false;events.push('exit-replay');},
    refreshHud:()=>events.push('refresh'),
    getFavoriteDraft:()=>({start,label:'TEST SITE · CLEAR'}),
    playFavorite:fav=>events.push('play-'+fav.id),
    canPlayFavorite:()=>playAllowed,
    hideCampaignScreen:()=>events.push('hide-campaign'),
    onLibraryOpen:fromMenu=>{flow.openLibrary(fromMenu);},
    onLibraryClose:restore=>flow.closeLibrary(restore),
    returnToCampaignMenu:()=>{flow.setMode('menu');events.push('return-menu');}
  });
  return {
    ui,controller,flow,help,events,loadedBookmarks,values,
    playing:value=>{playing=value;},
    allowPlaying:value=>{playAllowed=value;},
    cleanup:()=>{
      if(documentBefore===undefined)delete globalThis.document;
      else globalThis.document=documentBefore;
      if(storageBefore===undefined)delete globalThis.localStorage;
      else globalThis.localStorage=storageBefore;
    }
  };
}
test('mission favorites are stored as validated starts and rendered outside main',()=>{
  const s=setup();
  try{
    s.controller.renderFavorites();
    assert.equal(s.ui.favoriteMissionsList.children[0].children[0].tag,'p');
    s.ui.favoriteMission.click();
    const stored=readFavoriteMissions(
      s.values.get('fieldwork3d.favorite-missions.v1'));
    assert.equal(stored.length,1);
    assert.equal(s.controller.activeFavoriteId,stored[0].id);
    const row=s.ui.favoriteMissionsList.children[0].children[0];
    const play=row.children[1],remove=row.children[2];
    assert.equal(play.textContent,'PLAY');
    play.click();
    assert.ok(s.events.includes('play-'+stored[0].id));
    s.allowPlaying(false);
    s.controller.renderFavorites();
    assert.equal(s.ui.favoriteMissionsList.children[0].children[0].children[1].disabled,true);
    remove.click();
    assert.equal(readFavoriteMissions(
      s.values.get('fieldwork3d.favorite-missions.v1')).length,0);
  }finally{s.cleanup();}
});
test('library back navigation preserves home origin but debrief entry does not',()=>{
  const s=setup();
  try{
    s.controller.openFromMenu();
    assert.equal(s.ui.replayLibraryDialog.hidden,false);
    assert.equal(s.ui.replayLibraryBackdrop.hidden,false);
    assert.ok(s.events.includes('hide-campaign'));
    s.ui.closeReplayLibrary.click();
    assert.equal(s.ui.replayLibraryDialog.hidden,true);
    assert.equal(s.events.filter(x=>x==='return-menu').length,1);
    s.controller.show();
    s.ui.replayLibraryBackdrop.click();
    assert.equal(s.events.filter(x=>x==='return-menu').length,1);
  }finally{s.cleanup();}
});
test('session reset closes library, clears active favorite and never changes mission film',()=>{
  const s=setup();
  try{
    s.controller.activateFavorite('saved-1');
    s.controller.show();
    s.controller.resetSession();
    assert.equal(s.controller.activeFavoriteId,null);
    assert.equal(s.controller.activeSavedReplayId,null);
    assert.equal(s.ui.replayLibraryDialog.hidden,true);
    assert.equal(s.events.includes('enter-replay'),false);
  }finally{s.cleanup();}
});
test('unsaved bookmarks retain actionable guidance without touching IndexedDB',async()=>{
  const s=setup();
  try{
    await s.controller.persistCurrentBookmarks();
    assert.deepEqual(s.help,['BOOKMARK ADDED · SAVE REPLAY TO PRESERVE']);
  }finally{s.cleanup();}
});
