import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {team} from '../src/breach-game.ts';
import {occupiedFogRooms} from '../src/breach-fog-mask.ts';

const source=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
const update=source.slice(source.indexOf('  update(s:Session,selected:string,dt:number,'));

test('a scene frame shares one friendly snapshot without hiding red actors',()=>{
 assert.equal((update.match(/team\(s\)/g)??[]).length,1);
 assert.match(update,/const friendlyTeam=team\(s\)/);
 assert.match(update,/const selectedActor=friendlyTeam\.find\(a=>a\.id===selected\)/);
 assert.match(update,/for\(const actor of s\.operators\)\{/);
 const players=[{id:'blue1',side:'blue',health:2,p:{x:5,y:5}},
  {id:'red1',side:'red',health:2,p:{x:6,y:6}},
  {id:'blue2',side:'blue',health:0,p:{x:9,y:9}}];
 assert.deepEqual(team({operators:players}).map(a=>a.id),['blue1','blue2']);
 assert.equal(team({operators:players}).find(a=>a.id==='blue2')?.health,0);
});

test('roof occupancy preserves directional-fog rules and uses a reusable membership set',()=>{
 assert.match(source,/frameOccupiedRoomIds=new Set<string>\(\)/);
 assert.match(update,/const occupiedRoomIds=this\.frameOccupiedRoomIds;\s*occupiedRoomIds\.clear\(\)/);
 assert.match(update,/for\(const room of occupiedFogRooms\(s\)\)occupiedRoomIds\.add\(room\.id\)/);
 assert.doesNotMatch(update,/new Set\(occupiedFogRooms\(s\)\.map/);
 const base={site:{rooms:[
  {id:'a',x:0,y:0,w:100,h:100},{id:'b',x:100,y:0,w:100,h:100}]},
  operators:[{id:'blue1',side:'blue',health:1,p:{x:50,y:50}},
    {id:'blue2',side:'blue',health:0,p:{x:150,y:50}}]};
 assert.deepEqual(occupiedFogRooms(base).map(r=>r.id),['a']);
});

test('camera cutaways reuse the same camera-relative XY direction for walls and door leaves',()=>{
 assert.match(update,/const fromCamera=this\.frameCutawayDirection/);
 assert.match(update,/fromCamera\.x=this\.projectionCamera\.position\.x-this\.target\.x/);
 assert.match(update,/fromCamera\.y=this\.projectionCamera\.position\.z-this\.target\.z/);
 assert.equal((update.match(/,fromCamera,maxCutDistance/g)??[]).length,2);
 assert.doesNotMatch(update,/projectionCamera\.position\.clone\(\)\.sub\(this\.target\)/);
});

test('door presentation reuses one center across disclosure and halo reachability',()=>{
 assert.match(update,/const doorPoint=doorCenter\(door\)/);
 assert.match(update,/const directlyObserved=!personal&&liveVisibility\(s,doorPoint\)/);
 assert.match(update,/knownAt\(s,doorPoint\.x,doorPoint\.y\)/);
 assert.doesNotMatch(update,/knownAt\(s,doorCenter\(door\)\.x/);
 assert.match(update,/object\.halo\.visible=!replayDisclosurePolicy&&/);
});

test('shadow quality is evaluated once per frame, never once per visible actor',()=>{
 const expr='const shadowDetail=operatorShadowDetail(';
 assert.equal(update.split(expr).length-1,1);
 assert.match(update,/projectedOperatorHeightPx\(this\.camera,this\.height\),this\.quality\.mode/);
 assert.ok(update.indexOf(expr)<update.indexOf('    for(const actor of s.operators){'));
 assert.match(update,/cavityQualityForDetail\(shadowDetail\)/);
});
