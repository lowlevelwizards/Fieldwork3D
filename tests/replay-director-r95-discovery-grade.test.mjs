import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {directorRecordedDiscovery} from '../src/breach-replay-director-discovery.ts';
import {selectDirectorEditorialShot} from '../src/breach-replay-director-edit.ts';
import {gradeActualDirectorShot,directorGradeLetter}
  from '../src/breach-replay-director-grade.ts';

const p=(x,y)=>({x,y});
const blue=new Set(['rook','moss']);
const room={id:'warehouse',x:0,y:0,w:500,h:360};
const safe={left:-.79,right:.79,top:.70,bottom:-.43};
const frame=(t,seenGround=[],eyes=['guard'],knowledge=true)=>({
  t,actors:[
    {id:'rook',p:p(124,160),health:4,side:'blue'},
    {id:'moss',p:p(142,198),health:4,side:'blue'},
    {id:'guard',p:p(235,160),health:4,side:'red'}],
  doors:[],coverState:[],seenGround,
  knowledge:knowledge?{
    visibleActorIds:eyes,
    operatorVisibleActorIds:{rook:eyes,moss:[]},
    operatorVisibleCivilianIds:{rook:[],moss:[]},
    visibleCivilianIds:[],discoveredBodyIds:[]}:undefined
});
const shot=(changes={})=>({
  shotType:'contact',editorialKind:'engage',editorialId:'fight:1',
  primaryActorId:'rook',subjects:['rook','moss'],
  cameraAnchor:p(77,84),focus:p(180,160),zoom:3,
  fov:108,contactTargetPoint:p(235,160),
  actionAxis:p(1,0),cameraDecision:'hold:action-covered',
  ...changes
});
const grade=(s,now,previous,visible=new Set(['guard']))=>
  gradeActualDirectorShot({shot:s,current:now,previous,
    friendlies:blue,rooms:[room],walls:[],
    lens:'ortho',aspect:.46,baseSpan:1100,
    safeFrame:safe,visibleHostiles:visible});

test('R9.5 no future knowledge, old films fail closed',()=>{
 const old=frame(1,[],[],false),now=frame(2,['0,0','1,0'],['guard']);
 assert.equal(directorRecordedDiscovery(now,old,blue).strength,0);
 assert.equal(directorRecordedDiscovery(old,now,blue).strength,0);
 assert.equal(directorRecordedDiscovery(now,now,blue).strength,0);
});
test('R9.5 actual new terrain and first observer contact count, not old known tiles',()=>{
 const before=frame(4,['0,0'],[]);
 const after=frame(5,['0,0','1,0','2,0','3,0','4,0'],['guard']);
 const d=directorRecordedDiscovery(after,before,blue);
 assert.equal(d.newGround,4);
 assert.equal(d.newHostiles,1);
 assert.equal(d.observerId,'rook');
 assert.ok(d.strength>0);
 const held=directorRecordedDiscovery(after,after,blue);
 assert.equal(held.newGround,0);
});
test('R9.5 real LOOK/WATCH observer outranks generic squad framing during new ground',()=>{
 const roster=[
  {id:'rook',p:p(124,160),side:'blue',health:4,heading:0,velocity:14},
  {id:'moss',p:p(142,198),side:'blue',health:4,heading:0,velocity:20}
 ];
 const intent={actorId:'rook',position:p(124,160),heading:0,
  direction:p(1,0),speed:14,kind:'travel',route:[p(124,160),p(190,160)],
  watchDirection:p(0,1),plannedAttention:null,door:null,
  destination:p(190,160),activeRevision:null};
 const selected=selectDirectorEditorialShot(5,roster,{
   upcoming:null,intents:[intent],
   discovery:{newGround:7,newHostiles:0,newCivilians:0,
     observerId:null,strength:.65}});
 assert.equal(selected.kind,'follow');
 assert.equal(selected.primaryActorId,'rook');
 assert.ok(selected.discoveryStrength>.6);
 assert.equal(selected.optional.length,0,
  'support cast is optional while discovering unknown ground');
 assert.ok(selected.interest.y>160);
 assert.match(selected.reason,/newly discovered/);
});
test('R9.5 new discovery does not override an actual recorded firefight',()=>{
 const roster=[
  {id:'rook',p:p(124,160),side:'blue',health:4,heading:0,velocity:10},
  {id:'moss',p:p(142,198),side:'blue',health:4,heading:0,velocity:0}
 ];
 const selected=selectDirectorEditorialShot(5,roster,{
  intents:[],upcoming:null,
  beat:{id:'fight:1',kind:'fight',first:5,start:3,last:5,end:6,
    actorId:'rook',shooterId:'rook',targetId:'guard',
    shooter:p(124,160),target:p(235,160),doorId:null},
  actionPair:{shooter:p(124,160),target:p(235,160)},
  discovery:{newGround:20,newHostiles:1,newCivilians:0,
    observerId:'rook',strength:1}});
 assert.equal(selected.kind,'engage');
 assert.deepEqual(selected.target,p(235,160));
});
test('R9.5 the displayed held shot is graded, not its original solver score',()=>{
 const prev=frame(6,['0,0'],[]);
 const now=frame(7,['0,0','1,0'],['guard']);
 const excellent=grade(shot({score:-1000}),now,prev);
 assert.ok(excellent.score>=72,JSON.stringify(excellent));
 assert.ok(['S','A','B'].includes(excellent.grade));
 assert.equal(excellent.subjectVisible,true);
 assert.equal(excellent.targetVisible,true);
 const blank=grade(shot({cameraAnchor:p(30,10),focus:p(30,-400),
   zoom:8,score:100000,cameraDecision:'hold:room-confirmation'}),
   now,prev);
 assert.equal(blank.grade,'F',JSON.stringify(blank));
 assert.match(blank.summary,/No readable subject/);
 assert.equal(blank.decision,'hold:room-confirmation');
});
test('R9.5 obscured or undisclosed contact cannot grade S',()=>{
 const now=frame(7,['0,0'],['guard']);
 const stale=grade(shot(),now,frame(6,['0,0'],[]),new Set());
 assert.equal(stale.targetVisible,false);
 assert.ok(stale.score<=55,JSON.stringify(stale));
 assert.ok(['D','E','F'].includes(stale.grade));
});
test('R9.5 grades are monotone and cover all seven labels',()=>{
 for(const [n,letter] of [[99,'S'],[85,'A'],[75,'B'],[62,'C'],
   [48,'D'],[28,'E'],[0,'F']])
   assert.equal(directorGradeLetter(n),letter);
});
test('R9.5 visible grade, detailed debug rationale and clean camera separation',()=>{
 const main=readFileSync(new URL('../src/breach-main.ts',import.meta.url),'utf8');
 const css=readFileSync(new URL('../src/breach-style.css',import.meta.url),'utf8');
 const story=readFileSync(new URL('../src/breach-replay-director-storyboard.ts',
   import.meta.url),'utf8');
 assert.match(main,/ui\.replayFollowStatus\.dataset\.grade/);
 assert.match(main,/gradeActualDirectorShot/);
 assert.match(main,/replayDirectorGrade\.summary/);
 assert.match(css,/content:"SHOT " attr\(data-grade\)/);
 assert.ok(!story.includes('gradeActualDirectorShot'),
   'grade diagnostics must never trigger camera cuts');
});
