import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {buildAfterActionReport} from '../src/breach-after-action-report.ts';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('V5.2 source awards reconcile to existing weighted contribution totals',()=>{
 const rec={duration:12,completeness:{complete:true},
  frames:[{actors:[{id:'rook',health:4,injuryStage:0}]}],
  manifest:{actors:[{id:'rook',name:'ROOK',side:'blue'},
   {id:'guard',name:'GUARD',side:'red'}]},
  ballistics:{shots:[{id:1,recordedAt:5,shooterId:'rook',
   targetId:'guard',hit:true,down:true,healthBefore:2,healthAfter:0,
   hitRegion:'torso',surface:'blood'}]},
  events:[{id:1,t:2,kind:'intel',actor:'rook',
   meta:{action:'spot',targetId:'guard'}},
   {id:2,t:3,kind:'intel',actor:'rook',
    meta:{action:'spot',targetId:'guard'}},
   {id:3,t:4,kind:'door',actor:'rook',meta:{action:'door-open'}},
   {id:4,t:9,kind:'objective',actor:'rook',
    meta:{action:'objective-secure'}}],
  executionEvents:[]};
 const op=buildAfterActionReport(rec).operators[0];
 const evidence=op.contributions;
 assert.equal(op.contribution,26);
 assert.equal(evidence.reduce((n,e)=>n+e.points,0),26);
 assert.equal(evidence.filter(e=>e.category==='recon').length,1);
 assert.equal(evidence.find(e=>e.sourceKey==='shot:1').points,14);
 assert.ok(evidence.every(e=>e.sourceKey.startsWith('battle:')||
  e.sourceKey.startsWith('shot:')));
});

test('V5.2 roster retains existing 3D presenter with linked event inspector',()=>{
 const squad=read('src/ui/breach-after-action-squad.ts');
 const ui=read('src/ui/breach-after-action-controller.ts');
 assert.match(squad,/fw-v5-contribution-bar/);
 assert.match(squad,/fw-v5-recorded-actions/);
 assert.match(ui,/s.timelineSelectedKey=sourceKey/);
 assert.doesNotMatch(squad,/createSquadMiniature/);
});
