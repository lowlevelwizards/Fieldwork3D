/** Rendering only needs "known or not" for structural geometry. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newSession} from '../src/breach-game.ts';
import {WALLS,COVER,activateSite} from '../src/breach-core.ts';
import {spatialSurfaceKnown,spatialSurfaceState}
  from '../src/breach-presentation.ts';

test('known-only geometry matches original full classification across modes',()=>{
  try{
    for(const seed of [17,238]){
      const s=newSession(0,seed,'true-blind');
      // Some known objects may have missing world data; never reveal them.
      for(const mode of ['true-blind','floor-plan','exterior-known','full-view']){
        s.intel.mode=mode;
        for(const omniscient of [false,true]){
          for(const kind of ['wall','room','door','cover']){
            const keys=kind==='wall'?[...Array(WALLS.length).keys(),WALLS.length+12]:
              kind==='cover'?[...Array(COVER.length).keys(),COVER.length+12]:
              kind==='door'?[...s.doors.map(d=>d.id),'__unknown-door__']:
              [...(s.site?.rooms??[]).map(r=>r.id),'__unknown-room__'];
            for(const key of keys){
              // Exercise both unknown and known branches, including fallback.
              const known=kind==='wall'?s.intel.walls:
                kind==='cover'?s.intel.cover:
                kind==='room'?s.intel.rooms:s.intel.doors;
              known.delete(key);
              assert.equal(spatialSurfaceKnown(s,kind,key,omniscient),
                spatialSurfaceState(s,kind,key,omniscient)!=='unknown');
              known.add(key);
              assert.equal(spatialSurfaceKnown(s,kind,key,omniscient),
                spatialSurfaceState(s,kind,key,omniscient)!=='unknown');
            }
          }
        }
      }
    }
  }finally{activateSite(null);}
});
test('renderer uses knowledge-only geometry gate without tactical sight rays',()=>{
  const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  assert.match(scene,/spatialSurfaceKnown\(s,'room',id,omniscient\)/);
  assert.match(scene,/spatialSurfaceKnown\(s,item\.kind,\s*item\.index,omniscient\)/);
  assert.match(scene,/spatialSurfaceKnown\(s,'door',door\.id,omniscient\)/);
  assert.doesNotMatch(scene,/spatialSurfaceState\(s,/,
    'only full classification should cast rays; geometry gate never needs it');
});
