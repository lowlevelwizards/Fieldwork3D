import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {newDispatchPilotCampaign} from '../src/dispatch-campaign-starter.ts';
import {newCampaign} from '../src/campaign-state.ts';
import {dispatchCaseCloseout} from '../src/dispatch-case-closeout.ts';
import {dispatchCaseDossier} from '../src/dispatch-case-dossier.ts';

const report=(job,id='d14d-record',outcome='success')=>({
 id,contractId:job.id,day:3,outcome,grade:outcome==='success'?'B':'F',
 elapsed:88,participatingIds:['rook'],casualties:[],
 objective:outcome==='success',events:[]
});
const evidence=(injured=0,down=0)=>({
 version:1,blueCivilianInjured:injured,blueCivilianDown:down,
 challenges:1,refusals:0,surrenders:1
});

test('D14.8 settled records distinguish provisional reports from recorded outcomes',()=>{
 const base=newDispatchPilotCampaign(14821);
 const job=base.contracts[0];
 const recorded=report(job);
 const saved={...base,history:[recorded]};
 const before=structuredClone(saved);
 const closeout=dispatchCaseCloseout(saved,recorded);
 assert.ok(closeout);
 assert.equal(closeout.reported,dispatchCaseDossier(saved,job).lead);
 assert.match(closeout.recorded,/MISSION SUCCESS · OBJECTIVE RECORDED COMPLETE · GRADE B/);
 assert.match(closeout.forceEvidence,/NO RETAINED FORCE REVIEW/);
 assert.match(closeout.relationship,/NO RECORDED PRIOR OPERATION LINK/);
 assert.deepEqual(saved,before,'no changes to settled reports, money or contracts');
 assert.equal(dispatchCaseCloseout(saved,{...recorded,id:'not-saved'}),null);
 assert.equal(dispatchCaseCloseout(newCampaign(14821),recorded),null);
});

test('D14.8 force evidence is narrowly attributed; missing review is never exoneration',()=>{
 const base=newDispatchPilotCampaign(14822);
 const job=base.contracts[0];
 const noHarm={...report(job),dispatchForce:evidence()};
 const harm={...report(job),dispatchForce:evidence(2,1)};
 assert.match(dispatchCaseCloseout({...base,history:[noHarm]},noHarm).forceEvidence,
  /NO SQUAD CIVILIAN HARM RECORDED · not a legal finding/);
 assert.match(dispatchCaseCloseout({...base,history:[harm]},harm).forceEvidence,
  /2 INJURED · 1 DOWN/);
});

test('D14.8 successful prior response does not assert same suspect or premises',()=>{
 const base=newDispatchPilotCampaign(14823);
 const root=base.contracts[0];
 const child={...root,id:'d14d-child',followUpOf:root.id};
 const previous=report(root,'previous');
 const closed=report(child,'child','failure');
 const joined={...base,contracts:[root,child],history:[previous,closed]};
 const closeout=dispatchCaseCloseout(joined,closed);
 assert.match(closeout.recorded,/MISSION FAILURE · OBJECTIVE RECORDED INCOMPLETE/);
 assert.match(closeout.relationship,/RELATED RESPONSE/);
 assert.match(closeout.relationship,/shared suspects and site not established/);
 const withoutPrior={...joined,contracts:[child]};
 assert.match(dispatchCaseCloseout(withoutPrior,closed).relationship,
  /PRIOR OPERATION RECORD UNAVAILABLE/);
 const withoutChild={...joined,contracts:[root]};
 assert.match(dispatchCaseCloseout(withoutChild,closed).reported,/UNAVAILABLE/);
 assert.match(dispatchCaseCloseout(withoutChild,closed).relationship,/ARCHIVED OR PRUNED/);
});

test('D14.7-8 UI keeps Dispatch summaries optional and existing accept boundary',()=>{
 const ui=readFileSync(new URL('../src/campaign-ui.ts',import.meta.url),'utf8');
 assert.match(ui,/dossier\.situation\.emphasis/);
 assert.match(ui,/RISK ASSESSMENT/);
 const chronicle=readFileSync(new URL('../src/ui/campaign/chronicle-view.ts',import.meta.url),'utf8');
 assert.match(chronicle,/OPERATION CLOSEOUT NOTES/);
 assert.match(chronicle,/const notes=node\('details','campaign-case-history'\)/);
 assert.match(chronicle,/REPORTED \/ UNCONFIRMED/);
 assert.match(chronicle,/RECORDED OUTCOME/);
 assert.match(ui,/this\.handlers\.chooseContract\(contract\.id\)/);
});
