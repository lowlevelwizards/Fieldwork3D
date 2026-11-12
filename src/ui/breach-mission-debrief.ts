/** Mission debrief and progression presentation. The authoritative debrief
 * scoring and replay archive remain in their established gameplay modules.
 * This renderer owns only the after-action panel's DOM.
 */
import type {CampaignMode} from '../breach-app-mode.ts';
import {debrief,team,type Session} from '../breach-game.ts';
import {sessionIntelligenceReview} from '../briefing/briefing-after-action.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import type {CampaignState} from '../campaign-state.ts';
import {renderAfterActionWorkspace} from './breach-after-action-controller.ts';
import {renderStructuredMissionDetails} from './breach-after-action-mission-details.ts';
type DebriefUi={
 debriefIntelBlock:HTMLElement;debriefIntelText:HTMLElement;
 debriefTitle:HTMLElement;debriefGrade:HTMLElement;
 debriefSurvivors:HTMLElement;debriefAccuracy:HTMLElement;
 debriefObjective:HTMLElement;debriefStats:HTMLElement;
};
const rendered=new WeakMap<HTMLElement,{
 recorder:MissionRecorder;phase:Session['phase'];operationsLogged:number;
 historyLength:number;campaignMode:string
}>();
export function renderMissionDebrief(input:{
 ui:DebriefUi;state:Session;brief:{name:string};
 recorder:MissionRecorder;campaign:CampaignState|null;
 campaignMode:CampaignMode;operationsLogged:number;
}):void{
 const {ui,state,brief,recorder,campaign,campaignMode,operationsLogged}=input;
 const root=ui.debriefStats.closest<HTMLElement>('.debrief');
 if(root){
   const previous=rendered.get(root);
   const historyLength=campaign?.history.length??0;
   if(previous&&previous.recorder===recorder&&previous.phase===state.phase&&
     previous.operationsLogged===operationsLogged&&
     previous.historyLength===historyLength&&previous.campaignMode===campaignMode)
     return;
   rendered.set(root,{recorder,phase:state.phase,operationsLogged,
     historyLength,campaignMode});
 }

    ui.debriefIntelBlock.hidden=!state.operationDossier;
    ui.debriefIntelText.textContent=state.operationDossier?
      sessionIntelligenceReview(state):'';
    const stats=debrief(state);
    ui.debriefTitle.textContent='DEBRIEF';
    // These values are from authoritative mission assessment, never
    // reconstructed from the (possibly incomplete) replay evidence.
    const outcome=root?.querySelector<HTMLElement>('#afterActionOutcome');
    if(outcome)outcome.textContent=state.phase==='won'?
      'MISSION COMPLETE':'MISSION FAILED';
    const summary=root?.querySelector<HTMLElement>('#afterActionSummary');
    summary?.setAttribute('data-outcome',state.phase==='won'?'complete':'failed');
    const missionName=root?.querySelector<HTMLElement>('#afterActionMissionName');
    if(missionName)missionName.textContent=brief.name.toUpperCase();
    const missionTime=root?.querySelector<HTMLElement>('#afterActionMissionTime');
    if(missionTime){
      const seconds=Math.max(0,Math.floor(stats.time));
      missionTime.textContent='TIME '+Math.floor(seconds/60)+':'+
        String(seconds%60).padStart(2,'0');
    }
    ui.debriefGrade.textContent=stats.grade+' · '+stats.score;
    ui.debriefSurvivors.textContent=stats.survived+' / '+team(state).length;
    ui.debriefAccuracy.textContent=stats.shots>0?stats.accuracy+'%':'—';
    ui.debriefObjective.textContent=stats.objective?
     'OBJECTIVE SECURED':'OBJECTIVE NOT COMPLETED';
    const note=root?.querySelector<HTMLElement>('#afterActionTakeaway');
    if(note){
      const wounded=stats.squad.filter(op=>op.survived&&op.injury>0).length;
      const heavy=stats.squad.filter(op=>op.survived&&op.injury>=2).length;
      const down=stats.squad.filter(op=>!op.survived).length;
      note.textContent=[
        stats.objective?'OBJECTIVE SECURED':'OBJECTIVE UNFINISHED',
        stats.survived+' / '+stats.squad.length+' SURVIVED',
        wounded?String(wounded)+' WOUNDED'+(heavy?' · '+heavy+' HEAVY':''):
          'NO SURVIVOR WOUNDS',
        ...(down?[down+' INCAPACITATED']:[])
      ].join(' · ');
    }
    // Keep the historical binding for older tools but retire the enormous
    // text dump; the user-visible report is now structured and interactive.
    ui.debriefStats.textContent=
      'GRADE '+stats.grade+' · SCORE '+stats.score+
      ' · TIME '+stats.time+'s · '+stats.survived+
      ' SURVIVORS · '+stats.shots+' SHOTS';
    const structured=root?.querySelector<HTMLElement>(
      '#afterActionMissionDetails');
    if(structured)structured.replaceChildren(renderStructuredMissionDetails({
      name:brief.name,stats,recorder,campaign,campaignMode,
      operationsLogged,phase:state.phase
    }));
    if(root)renderAfterActionWorkspace(root,recorder,
      {showIntel:!!state.operationDossier});
}
