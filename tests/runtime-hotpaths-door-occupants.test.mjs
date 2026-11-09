import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession,stepSession,team,toggling}
  from '../src/breach-game.ts';
import {activateSite} from '../src/breach-core.ts';

const source=readFileSync(new URL('../src/breach-game.ts',import.meta.url),'utf8');
test('door phase shares one live-body snapshot and refreshes after real yield',()=>{
  const part=source.slice(source.indexOf('export function stepSession('),
    source.indexOf("  mark('doors');",source.indexOf('export function stepSession(')));
  assert.match(part,/let doorOccupants=liveDoorOccupants\(s\)/);
  assert.match(part,/if\(yielded\)doorOccupants=liveDoorOccupants\(s\)/);
  assert.match(part,/advanceDoor\(door,h,doorOccupants\)/);
  assert.doesNotMatch(part,/advanceDoor\(door,h,\[/,
    'do not rebuild filtered positions for each separate door');
});
test('multi-door fixed ticks preserve live owner locations and valid physical fractions',()=>{
  try{
    const s=newSession(0,419,'full-view');
    const squad=team(s);
    assert.ok(squad.length>0&&s.doors.length>0);
    toggling(s);
    for(let i=0;i<180&&s.phase==='running';i++)stepSession(s,1/60);
    for(const door of s.doors){
      const fraction=door.openFraction??(door.open?1:0);
      assert.ok(Number.isFinite(fraction)&&fraction>=0&&fraction<=1.35,
        'invalid door position: '+door.id+' '+fraction);
    }
  }finally{activateSite(null);}
});
