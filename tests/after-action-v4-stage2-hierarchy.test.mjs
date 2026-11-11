import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAfterActionReport} from '../src/breach-after-action-report.ts';
import {renderSquadView,renderSquadDetails}
 from '../src/ui/breach-after-action-squad.ts';

const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
class MockElement{
 constructor(tag){
  this.tag=tag;this.className='';this.textContent='';
  this.attributes=new Map();this.children=[];this.events=new Map();
  this.type=null;
 }
 append(...nodes){this.children.push(...nodes);}
 setAttribute(k,v){this.attributes.set(k,String(v));}
 getAttribute(k){return this.attributes.get(k)??null;}
 addEventListener(name,callback){this.events.set(name,callback);}
 click(){this.events.get('click')?.();}
}
const descendants=(node,cls)=>[
 ...(node.className?.split(' ').includes(cls)?[node]:[]),
 ...node.children.flatMap(child=>descendants(child,cls))
];
const text=(node)=>node.textContent+node.children.map(text).join('');
function withDocument(fn){
 const original=globalThis.document;
 globalThis.document={createElement:tag=>new MockElement(tag)};
 try{return fn();}finally{
  if(original===undefined)delete globalThis.document;
  else globalThis.document=original;
 }
}
const rec=()=>({
 manifest:{actors:[
  {id:'rook',name:'ROOK',side:'blue'},
  {id:'moss',name:'MOSS',side:'blue'},
  {id:'ash',name:'ASH',side:'blue'},
  {id:'vale',name:'VALE',side:'blue'},
  {id:'guard',name:'GUARD',side:'red'}
 ]},
 duration:40,completeness:{complete:true},
 frames:[{actors:[
  {id:'rook',health:4,injuryStage:0},
  {id:'moss',health:4,injuryStage:1},
  {id:'ash',health:4,injuryStage:0},
  {id:'vale',health:0,injuryStage:2}
 ]}],
 ballistics:{shots:[{id:1,recordedAt:5,shooterId:'rook',
  targetId:'guard',hit:true,healthBefore:3,healthAfter:0,down:true,
  hitRegion:'torso',weaponAtFire:'rifle'}]},
 events:[{id:1,t:5,kind:'down',actor:'guard'},
  {id:2,t:4,kind:'intel',actor:'rook',
    meta:{action:'spot',targetId:'guard'}}]
});

test('V4-2: contribution tie positions are genuine joint ranks, not fake ordinals',()=>{
 const report=buildAfterActionReport(rec());
 assert.deepEqual(report.operators.map(o=>o.id),['rook','ash','moss','vale']);
 assert.deepEqual(report.operators.map(o=>o.rank),[1,2,2,2]);
 assert.equal(report.operators[0].contribution,16);
 assert.equal(report.operators[0].categories.combat,14);
 assert.equal(report.operators[0].categories.recon,2);
 assert.equal(report.operators[2].status,'wounded');
 assert.equal(report.operators[3].status,'incapacitated');
});

test('V4-2: initial squad is unselected and shows all ranked operators without 2D art',()=>
 withDocument(()=>{
 const report=buildAfterActionReport(rec());
 const chosen=[],details=[];
 const root=renderSquadView(report,rec().manifest,null,
  id=>chosen.push(id),id=>details.push(id));
 const rows=descendants(root,'fw-v4-rank-row');
 assert.equal(rows.length,4);
 assert.ok(rows.every(row=>row.getAttribute('aria-pressed')==='false'));
 assert.equal(descendants(root,'fw-v4-team-overview').length,1);
 assert.equal(descendants(root,'fw-v4-selected-overview').length,0);
 assert.equal(descendants(root,'fw-v3-miniature').length,0);
 assert.match(text(rows[0]),/ROOK/);
 assert.match(text(rows[1]),/TIED #2/);
 assert.match(text(root),/RECORDED TEAM CONTRIBUTIONS/);
 assert.match(text(root),/16 pts/);
 assert.match(text(root),/not the mission grade or Campaign XP/);
 rows[2].click();
 assert.deepEqual(chosen,['moss']);
 assert.deepEqual(details,[]);
}));

test('V4-2: selected performance keeps squad ranks and offers explicit return to overview',()=>
 withDocument(()=>{
 const report=buildAfterActionReport(rec());
 const actions={chosen:[],more:[]};
 const root=renderSquadView(report,null,'moss',
  id=>actions.chosen.push(id),id=>actions.more.push(id));
 const rows=descendants(root,'fw-v4-rank-row');
 assert.equal(rows.length,4);
 assert.deepEqual(rows.map(row=>row.getAttribute('aria-pressed')),
   ['false','false','true','false']);
 assert.equal(descendants(root,'fw-v4-selected-overview').length,1);
 assert.match(text(root),/MOSS/);
 assert.match(text(root),/WOUNDED/);
 assert.match(text(root),/COMBAT/);
 assert.match(text(root),/OBJECTIVE/);
 assert.equal(descendants(root,'fw-v3-miniature').length,0);
 descendants(root,'fw-v3-details-link')[0].click();
 assert.deepEqual(actions.more,['moss']);
 descendants(root,'fw-v4-overview-back')[0].click();
 assert.deepEqual(actions.chosen,[null]);
}));

test('V4-2: partial evidence, injury, missing action logs are not disguised as achievements',()=>
 withDocument(()=>{
 const partial=rec();partial.completeness.complete=false;
 const report=buildAfterActionReport(partial);
 const root=renderSquadView(report,null,'vale',()=>{},()=>{});
 assert.match(text(root),/PARTIAL REPLAY/);
 assert.match(text(root),/INCAPACITATED/);
 const detail=renderSquadDetails(report.operators.find(x=>x.id==='vale'));
 assert.match(text(detail),/CONDITION/);
 assert.match(text(detail),/INCAPACITATED/);
 assert.match(text(detail),/NOT RECORDED/);
 assert.doesNotMatch(text(detail),/✦ INCAPACITATED/);
}));

test('V4-2: new summary is permanent and populated only from authoritative debrief stats',()=>{
 const html=source('index.html');
 const debrief=source('src/ui/breach-mission-debrief.ts');
 const ui=source('src/ui/breach-after-action-controller.ts');
 assert.match(html,/id="afterActionSummary"/);
 assert.match(html,/id="afterActionOutcome"/);
 assert.match(html,/id="afterActionMissionName"/);
 assert.match(html,/id="afterActionMissionTime"/);
 for(const field of ['debriefGrade','debriefSurvivors',
    'debriefAccuracy','debriefObjective'])
   assert.match(html,new RegExp('id="'+field+'"'));
 assert.doesNotMatch(html,/id="afterActionContinue"/);
 assert.doesNotMatch(html,/id="afterActionIntro"/);
 assert.doesNotMatch(ui,/afterActionContinue/);
 assert.match(debrief,/const stats=debrief\(state\)/);
 assert.match(debrief,/summary\?\.setAttribute\('data-outcome'/);
 assert.match(debrief,/stats\.shots>0\?stats\.accuracy/);
 assert.match(debrief,/stats\.survived\+' \/ '\+team\(state\)\.length/);
 assert.match(debrief,/stats\.objective/);
 assert.match(ui,/selectedOperator:null/);
 assert.match(ui,/fw-v4-squad-active/);
 assert.match(ui,/focus\.replaceWith\(record\)/);
 assert.doesNotMatch(source('src/ui/breach-after-action-squad.ts'),
  /createSquadMiniature|SVGSVGElement/);
});

test('V4-2: stage 1 replay return and continuation endpoints remain in shell',()=>{
 const html=source('index.html');
 const ui=source('src/ui/breach-after-action-controller.ts');
 for(const id of ['afterActionTabs','afterActionBody','afterActionDetails',
   'afterActionDetailsToggle','watchReplay','retry','next',
   'afterActionMainMenu','afterActionOperatorDetail'])
   assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(ui,/operatorRecordOpen:s\.operatorRecordOpen/);
 assert.match(ui,/s\.operatorRecordOpen=context\.operatorRecordOpen/);
 assert.match(ui,/port\.setReturn\(origin\)/);
});
