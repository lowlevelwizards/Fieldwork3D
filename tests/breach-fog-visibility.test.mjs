import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {occupiedFogRooms,paintOccupiedRoomContext}
  from '../src/breach-fog-mask.ts';
const room=(id,x)=>({id,x,y:100,w:100,h:120,kind:'room',tone:0});
const scene=(friends)=>({
  site:{rooms:[room('A',100),room('B',200)]},
  operators:[...friends.map((p,i)=>({id:'blue'+i,side:'blue',health:p.health??2,
    p:{x:p.x,y:p.y}})),{id:'guard',side:'red',health:2,p:{x:250,y:150}}],
});
test('3D fog: occupied rooms preserve structure without revealing neighboring rooms',()=>{
  const s=scene([{x:150,y:150}]);
  assert.deepEqual(occupiedFogRooms(s).map(r=>r.id),['A']);
  assert.deepEqual(occupiedFogRooms(scene([{x:150,y:150,health:0}])),[]);
  assert.deepEqual(occupiedFogRooms(scene([{x:90,y:150}])),[]);
  assert.deepEqual(occupiedFogRooms({...s,site:undefined}),[]);
});
test('3D fog: occupied-room removal remains bounded to its own floor',()=>{
  const calls=[];
  const ctx={
    save(){calls.push(['save'])},restore(){calls.push(['restore'])},
    setTransform(...args){calls.push(['transform',...args])},
    fillRect(...args){calls.push(['rect',...args])},
    globalCompositeOperation:'source-over',fillStyle:'#000',filter:'none',
  };
  paintOccupiedRoomContext(ctx,scene([{x:150,y:150}]));
  assert.deepEqual(calls.filter(x=>x[0]==='rect'),[['rect',104,104,92,112]]);
  assert.equal(ctx.globalCompositeOperation,'destination-out');
  calls.length=0;
  paintOccupiedRoomContext(ctx,scene([{x:90,y:150}]));
  assert.equal(calls.length,0);
});
test('3D fog: translucent cutaway walls draw after fog while blood stays gated',()=>{
  const code=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
  assert.match(code,/this\.smoothFog\.renderOrder=1000;/);
  assert.match(code,/wall\.mesh\.renderOrder=cut\?1001:0;/);
  assert.match(code,/material\.opacity=cut\?\.38:1;/);
  assert.match(code,/paintOccupiedRoomContext\(this\.fogContext,s\);/);
  assert.match(code,/opacity:\.82,depthTest:true/);
  assert.match(code,/if\(!omniscient&&!liveVisibility\(s,mark\.p\)\)continue;/);
});
