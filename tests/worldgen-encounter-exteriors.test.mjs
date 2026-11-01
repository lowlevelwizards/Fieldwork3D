import test from 'node:test';
import assert from 'node:assert/strict';
import {assignExteriorOccupants} from '../src/worldgen/encounter-exteriors.ts';
test('exterior pass is a no-op for sites without exterior zones',()=>{
 const site={rooms:[],doors:[],walls:[],cover:[],spawn:[{x:100,y:100}],
  extract:{x:120,y:100},exteriorZones:[]};
 const actors=[{id:'a',position:{x:40,y:40}}];
 assert.deepEqual(assignExteriorOccupants(site,actors,'guarded',5),actors);
});
