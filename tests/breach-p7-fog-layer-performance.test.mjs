import test from 'node:test';
import assert from 'node:assert/strict';
import {paintFogMemory,paintFogVisibility,paintFogMask,UNKNOWN_FOG_COLOR}
  from '../src/breach-fog-mask.ts';
import {fogMemoryFingerprint,fogFingerprint} from '../src/breach-fog-cache.ts';
import {newSession} from '../src/breach-game.ts';
import {snapshot,applyReplayFrame} from '../src/breach-replay.ts';

function context(){
  const calls=[];
  const ctx={
    canvas:{width:320,height:370},
    fillStyle:'',filter:'none',lineWidth:1,strokeStyle:'',
    globalCompositeOperation:'source-over',
    save(){calls.push('save')},restore(){calls.push('restore')},
    setTransform(...v){calls.push('transform:'+v.join(','))},
    clearRect(...v){calls.push('clear:'+v.join(','))},
    fillRect(...v){calls.push('rect:'+this.fillStyle+':'+this.globalCompositeOperation+':'+v.join(','))},
    beginPath(){calls.push('begin')},moveTo(){calls.push('move')},
    lineTo(){calls.push('line')},closePath(){calls.push('close')},
    rect(){calls.push('cell')},
    fill(){calls.push('fill:'+this.fillStyle+':'+this.globalCompositeOperation)},
    stroke(){calls.push('stroke')},
  };
  return {ctx,calls};
}
const fakeSession=mode=>({
  site:undefined,doors:[],seenGround:new Set(['fine:1,1','micro:2,2']),
  operators:[{id:'blue0',side:'blue',health:2,p:{x:120,y:130},
    heading:0,posture:'stand'}],
  intel:{mode,rooms:new Set(),walls:new Set(),cover:new Set(),doors:new Set()}
});
test('independent memory and live passes preserve the full-mask draw sequence',()=>{
  for(const mode of ['true-blind','floor-plan','exterior-known','full-view']){
    const s=fakeSession(mode),old=context(),split=context();
    paintFogMask(old.ctx,s);
    paintFogMemory(split.ctx,s);
    paintFogVisibility(split.ctx,s);
    assert.deepEqual(split.calls,old.calls,mode+' must retain all fog operations');
    assert.ok(split.calls.some(x=>x.includes('rect:'+UNKNOWN_FOG_COLOR)),
      'no purely black interior holes');
    assert.ok(split.calls.some(x=>x.includes('fill:')&&x.includes('destination-out')),
      'live sight removes fog rather than opening whole rooms');
  }
});
test('memory pass is independent of live cone movement and never clears rooms',()=>{
  const s=fakeSession('true-blind');
  const memory=context(),live=context();
  paintFogMemory(memory.ctx,s);
  paintFogVisibility(live.ctx,s);
  assert.ok(memory.calls.some(x=>x.startsWith('clear:')));
  assert.ok(!live.calls.some(x=>x.startsWith('clear:')||x.startsWith('rect:')));
  assert.ok(!memory.calls.some(x=>x==='move'),'memory pass must not draw sight rays');
  assert.ok(live.calls.some(x=>x==='move'),'live pass must draw vision polygons');
});
test('fog memory fingerprint changes for same-sized but different memories',()=>{
  const a={mode:'true-blind',seed:11,seenRevision:3,rooms:0,
    walls:1,doors:1,cover:0};
  assert.equal(fogMemoryFingerprint(a),fogMemoryFingerprint({...a}));
  assert.notEqual(fogMemoryFingerprint(a),fogMemoryFingerprint({...a,seenRevision:4}));
  assert.notEqual(fogMemoryFingerprint(a),fogMemoryFingerprint({...a,mode:'floor-plan'}));
  const key={mode:'true-blind',seed:11,seenCount:10,seenRevision:3,
    revision:0,actors:[],doors:[]};
  assert.notEqual(fogFingerprint(key),fogFingerprint({...key,seenRevision:4}));
});
test('replay seek invalidates memory with different cells and equal count',()=>{
  const s=newSession(0);
  s.seenGround=new Set(['micro:2,2']);
  const base=snapshot(s);
  const changed={...base,seenGround:['micro:3,3']};
  const start=s.seenGroundRevision;
  applyReplayFrame(s,base);
  assert.equal(s.seenGroundRevision,start+1);
  applyReplayFrame(s,changed);
  assert.equal(s.seenGroundRevision,start+2);
  assert.ok(s.seenGround.has('micro:3,3'));
  applyReplayFrame(s,changed);
  assert.equal(s.seenGroundRevision,start+2,'identical frame shared memory not repainted');
});
