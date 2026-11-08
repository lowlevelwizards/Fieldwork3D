import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directorRecordedContact}
 from '../src/breach-replay-director-contact.ts';
import {directorCompositionQuality}
 from '../src/breach-replay-director-projection.ts';
import {ReplayDirectorStoryboard}
 from '../src/breach-replay-director-storyboard.ts';
import {applyReplayKnowledge,replayActorDisclosed}
 from '../src/breach-replay-visibility.ts';
import {groundMarkHiddenByWallFromCamera,groundMarkHiddenByActors}
 from '../src/breach-ground-geometry.ts';
const p=(x,y)=>({x,y});
const blue=new Set(['rook','moss']);
const actor=(id,x,y,health=4)=>({id,p:p(x,y),health});
const makeFrame=(evidence)=>({
 t:7,actors:[actor('rook',80,90),actor('moss',95,110),
 actor('guard',180,90),actor('unseen',220,90)],
 knowledge:evidence
});
test('R9.2 contact requires individual recorded visual truth',()=>{
 const noEvidence=makeFrame({visibleActorIds:['guard']});
 assert.equal(directorRecordedContact(noEvidence,blue),null);
 const evidence={visibleActorIds:['guard'],operatorVisibleActorIds:{
  rook:['guard'],moss:['unseen']}};
 const a=directorRecordedContact(makeFrame(evidence),blue);
 assert.deepEqual([a?.observerId,a?.targetId],['moss','unseen']);
 const chosen=directorRecordedContact(makeFrame(evidence),blue,'rook');
 assert.equal(chosen?.targetId,'guard');
 assert.equal(directorRecordedContact(makeFrame(evidence),blue,
  null,'rook')?.targetId,'guard');
 assert.equal(directorRecordedContact(makeFrame(evidence),blue,
  null,'vale'),null);
 const dead=makeFrame(evidence);
 dead.actors.find(x=>x.id==='guard').health=0;
 assert.equal(directorRecordedContact(dead,blue,'rook')?.targetId,'unseen');
});
test('R9.2 teammate foreground occludes target, not just the hero',()=>{
 const args=[p(25,80),p(124,80),p(90,125),p(175,80),
  p(1,0),'engage','ortho',.8,1100,2.6,108,.9,.9];
 const visible=directorCompositionQuality(...args);
 const obscured=directorCompositionQuality(...args,undefined,[p(125,80)]);
 assert.ok(obscured.targetOverlap>=visible.targetOverlap);
 assert.equal(obscured.targetReadable,false);
});
test('R9.2 quiet replay holds a shot instead of cutting at every knot',()=>{
 const room={id:'lab',x:0,y:0,w:600,h:250};
 const board=new ReplayDirectorStoryboard(7,t=>{
   const moved=t>=.5;
   const pos=moved?p(460,105):p(95,105);
   return {
    focus:moved?p(474,105):p(118,105),
    cameraAnchor:moved?p(406,105):p(46,105),
    roomId:'lab',fov:108,zoom:7,yaw:0,pitch:.4,
    actorsFramed:1,shotType:'travel',kind:'squad',
    subjects:['rook'],doorId:null,score:65,occluded:0,
    motion:0,operatorPoint:pos,requiredPoints:[pos],
    editorialId:'follow:rook',editorialKind:'follow',
    editorialPriority:2.6,actionAxis:p(1,0),
    subjectReadable:true,subjectVisibility:1,
    compositionQuality:{primaryReadable:true,score:96}
   };
 },{step:.5,rooms:[room],aspect:.7,baseSpan:1100});
 const early=[.5,1,1.5,2,2.5].map(t=>board.sample(t));
 assert.ok(early.every(s=>!s.cameraDecision.startsWith('cut:')),
  'brief visibility loss must not trigger a frantic camera edit');
 const decisions=Array.from({length:14},(_,i)=>board.sample(i*.5));
 const cuts=decisions.flatMap((s,i)=>
   s?.cameraDecision?.startsWith('cut:')?[i*.5]:[]);
 for(let i=1;i<cuts.length;i++)
   assert.ok(cuts[i]-cuts[i-1]>=3,'no rapid adjacent cuts');
});
test('R9.2 camera-exact blood cannot pass foreground wall or actor',()=>{
 const camera={x:0,y:53,z:-60},mark=p(0,0);
 const wall={a:p(-90,-10),b:p(90,-10)};
 assert.equal(groundMarkHiddenByWallFromCamera(mark,camera,[wall]),true);
 assert.equal(groundMarkHiddenByWallFromCamera(mark,camera,
  [{a:p(-90,10),b:p(90,10)}]),false);
 assert.equal(groundMarkHiddenByActors(mark,camera,[p(0,-9)]),true);
 assert.equal(groundMarkHiddenByActors(mark,camera,[p(30,-9)]),false);
});
test('R9.2 discovered corpses never disappear on squad replay or personal memory',()=>{
 const session={};
 const dead={id:'guard',side:'red',health:0};
 applyReplayKnowledge(session,{
  visibleActorIds:[],discoveredBodyIds:['guard'],
  operatorVisibleActorIds:{rook:[],moss:[]},
  operatorVisibleBodyIds:{rook:[],moss:[]},
  operatorDiscoveredBodyIds:{rook:['guard'],moss:[]}
 });
 assert.equal(replayActorDisclosed(session,dead,{mode:'squad'}),true);
 assert.equal(replayActorDisclosed(session,dead,
  {mode:'operator',observerId:'rook'}),false,
  'individual memory must not reveal a possibly moved unseen corpse');
 assert.equal(replayActorDisclosed(session,dead,
  {mode:'operator',observerId:'moss'}),false);
});
test('R9.2 user hide surface is wired and enemy names never render',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
 const scene=readFileSync(new URL('../src/breach-3d.ts',import.meta.url),'utf8');
 for(const key of ['names','contacts','plans','objectives','clear','show'])
  assert.ok(html.includes('data-overlay-choice="'+key+'"'));
 assert.match(main,/function clearReplayPresentation\(\)/);
 assert.match(main,/if\(!replaying\)for\(const door of state\.doors\)/);
 assert.ok(!main.includes('draw.fillText(hostile.name'));
 assert.match(scene,/object\.halo\.visible=!replayDisclosurePolicy/);
 assert.match(scene,/groundMarkHiddenByWallFromCamera/);
});
