/** Mission debrief and progression presentation. The authoritative debrief
 * scoring and replay archive remain in their established gameplay modules.
 * This renderer owns only the after-action panel's DOM.
 */
import {debrief,team,type Session} from '../breach-game.ts';
import {sessionIntelligenceReview} from '../briefing/briefing-after-action.ts';
import {formatAfterAction} from '../breach-after-action.ts';
import {formatMissionPacing} from '../breach-mission-pacing.ts';
import {formatCombatReview} from '../breach-combat-review.ts';
import type {MissionRecorder} from '../breach-replay.ts';
import type {CampaignState} from '../campaign-state.ts';
import {renderAfterActionWorkspace} from './breach-after-action-controller.ts';
type DebriefUi={
 debriefIntelBlock:HTMLElement;debriefIntelText:HTMLElement;
 debriefTitle:HTMLElement;debriefGrade:HTMLElement;
 debriefSurvivors:HTMLElement;debriefAccuracy:HTMLElement;
 debriefObjective:HTMLElement;debriefStats:HTMLElement;
};
export function renderMissionDebrief(input:{
 ui:DebriefUi;state:Session;brief:{name:string};
 recorder:MissionRecorder;campaign:CampaignState|null;
 campaignMode:'menu'|'home'|'mission'|'quick';operationsLogged:number;
}):void{
 const {ui,state,brief,recorder,campaign,campaignMode,operationsLogged}=input;

    ui.debriefIntelBlock.hidden=!state.operationDossier;
    ui.debriefIntelText.textContent=state.operationDossier?
      sessionIntelligenceReview(state):'';
    const stats=debrief(state);
    ui.debriefTitle.textContent=state.phase==='won'?'OPERATION COMPLETE':'MISSION FAILED';
    ui.debriefGrade.textContent=stats.grade+' · '+stats.score;
    ui.debriefSurvivors.textContent=stats.survived+' / '+team(state).length;
    ui.debriefAccuracy.textContent=stats.accuracy+'%';
    ui.debriefObjective.textContent=stats.objective?
     'OBJECTIVE SECURED':'OBJECTIVE NOT COMPLETED';
    ui.debriefStats.textContent=
      'OPERATION: '+brief.name.toUpperCase()+'\nGRADE: '+stats.grade+
      ' · SCORE '+stats.score+'\nTIME: '+stats.time+'s'+
      '\nOBJECTIVE: '+(stats.objective?'SECURED':'NOT COMPLETED')+
      '\nSURVIVORS: '+stats.survived+'/'+team(state).length+
      '\nSHOTS: '+stats.shots+' | HITS: '+stats.hits+
      ' | ACCURACY: '+stats.accuracy+'%'+
      '\nCASUALTIES: '+stats.casualties+' · PAUSES: '+stats.pauses+
      '\n'+stats.squad.map(o=>o.name+' '+(o.survived?
        o.injury?'WOUNDED':'ACTIVE':'DOWN')+' · '+o.fired+' RDS').join('\n')+
      '\nOPERATIONS LOGGED: '+operationsLogged+
      '\n\nMISSION PACING\n'+formatMissionPacing(recorder.events)+
      '\n\nCOMBAT REVIEW\n'+formatCombatReview(recorder.frames,recorder.events,
      recorder.ballistics.shots)+
      '\n\nTACTICAL TIMELINE\n'+formatAfterAction(recorder.events,10);
    const root=ui.debriefStats.closest<HTMLElement>('#debrief');
    if(root)renderAfterActionWorkspace(root,recorder,
      {showIntel:!!state.operationDossier});
    if(stats.rescueStatus!=='none')
      ui.debriefStats.textContent+='\nCIVILIAN RESCUE: '+
        stats.rescueStatus.toUpperCase().replaceAll('-',' ');
    if(campaignMode==='mission'&&campaign?.history.length){
     const recent=campaign.history[campaign.history.length-1];
     const lines=recent.gains?.flatMap(person=>{
      const member=campaign?.operators.find(m=>m.id===person.id);
      const improvements=Object.entries(person.gains)
       .filter(([,gain])=>(gain??0)>0)
       .map(([skill,gain])=>skill.replace(/([A-Z])/g,' $1')+' +'+((gain??0)*100).toFixed(1));
      return improvements.length?[((member?.callsign??person.id)+': '+improvements.join(', '))]:[];
     })??[];
     if(lines.length)ui.debriefStats.textContent+='\n\nCAREER DEVELOPMENT\n'+lines.join('\n');
    }
}
