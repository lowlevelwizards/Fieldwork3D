/** One owner for tactical session lifetimes and deployment preparation.
 * Session creation and insertion validity remain in breach-game.ts. This
 * controller sequences snapshots, resources, and transitions; it does NOT
 * implement order validation, enemy logic, or campaign persistence.
 */
import {activateSite} from './breach-core.ts';
import {
  newSession,team,availableDeployments,selectDeployment,type Session
} from './breach-game.ts';
import type {Site,SiteScale} from './breach-site.ts';
import type {IntelMode} from './breach-intel.ts';
import type {LightingMode} from './equipment-site-lighting.ts';
import type {OperationDossierV1} from './briefing/briefing-types.ts';
import {MissionRecorder} from './breach-replay.ts';
import {applyReplayActorIdentity} from './breach-replay-manifest.ts';
import {
  captureMissionStart,siteForMissionRestart,restoreMissionStartingTeam,
  type MissionStartSnapshot
} from './breach-mission-restart.ts';

export type MissionPreferences={
  legacyStudy:boolean;
  civilianPreview:boolean;
  requestedCondition:number|null;
  selectedIntelMode:IntelMode;
  requestedSiteScale:SiteScale;
  selectedLightingMode:LightingMode;
  mode:'menu'|'home'|'mission'|'quick';
};
export type MissionCreation={
  variant:number;
  seed?:number;
  missionOverride?:Session['missionType'];
  prebuiltSite?:Site;
  risk?:1|2|3;
  restartStart?:MissionStartSnapshot;
  /** The menu and fixed study intentionally start without generated sites. */
  withoutSite?:boolean;
  /** Initial boot keeps the already loaded Quick Play wardrobe untouched. */
  initial?:boolean;
};
export type MissionTransition={
  session:Session;
  recorder:MissionRecorder;
  deferScene:boolean;
};
type DeploymentControls={
  button:HTMLButtonElement;label:HTMLElement;
  getSession:()=>Session;isReplaying:()=>boolean;
  onSelected:()=>void;
  reducedMotion:()=>boolean;
};

export class BreachMissionController{
  private currentStart:MissionStartSnapshot|null=null;
  private selectedInsertion='FRONT';
  private deploymentSession:Session|null=null;
  private deploymentOptions:ReturnType<typeof availableDeployments>=[];
  private controls:DeploymentControls|null=null;

  private readonly hooks:{
    preferences:()=>MissionPreferences;
    randomSeed:()=>number;
    refreshQuickRoster:()=>void;
    applyRoster:(session:Session)=>void;
    applyCampaign:(session:Session)=>void;
    buildDossier:(session:Session,risk?:1|2|3)=>OperationDossierV1|undefined;
  };
  constructor(hooks:BreachMissionController['hooks']){
    this.hooks=hooks;
  }

  get entryId(){return this.selectedInsertion;}
  get start():MissionStartSnapshot{
    if(!this.currentStart)throw Error('Mission start is not initialized');
    return this.currentStart;
  }
  /** Only the creation path is allowed to choose seed, intel, lighting,
   * opening equipment, and narrative; the simulation builds the world. */
  create(request:MissionCreation):Session{
    const prefs=this.hooks.preferences();
    const siteSeed=request.withoutSite||prefs.legacyStudy?undefined:
      request.seed??this.hooks.randomSeed();
    const session=newSession(request.variant,siteSeed,
      request.restartStart?.intelMode??prefs.selectedIntelMode,
      request.restartStart?.scale??prefs.requestedSiteScale,
      request.missionOverride,request.prebuiltSite,
      {risk:request.risk,enableCivilians:prefs.civilianPreview,
       enableIncidentIntent:true});
    session.lightingMode=request.restartStart?.lightingMode??
      prefs.selectedLightingMode;
    this.applyRequestedCondition(session,prefs.requestedCondition);
    if(!request.initial&&prefs.mode==='quick')this.hooks.refreshQuickRoster();
    this.hooks.applyRoster(session);
    this.hooks.applyCampaign(session);
    session.operationDossier=request.restartStart?.dossier?
      structuredClone(request.restartStart.dossier):
      this.hooks.buildDossier(session,request.risk);
    this.selectedInsertion='FRONT';
    this.currentStart=captureMissionStart(session,prefs.requestedSiteScale);
    this.deploymentSession=null;
    this.deploymentOptions=[];
    return session;
  }
  private applyRequestedCondition(session:Session,condition:number|null):void{
    if(condition===null||!session.site)return;
    session.site={...session.site,conditionLevel:condition};
    activateSite(session.site);
  }
  /** Resource release always precedes construction; presenter setup only
   * occurs after the fresh session and recording are fully assigned. */
  transition(previous:Session,request:MissionCreation&{deferScene?:boolean},
    hooks:{
      beforeReplace:(previous:Session)=>void;
      mount:(transition:MissionTransition)=>void;
    }):MissionTransition{
    hooks.beforeReplace(previous);
    const session=this.create(request);
    const recorder=this.recordInitial(session);
    const result={session,recorder,deferScene:!!request.deferScene};
    hooks.mount(result);
    return result;
  }
  recordInitial(session:Session):MissionRecorder{
    const recorder=new MissionRecorder();
    recorder.capture(session,true);
    return recorder;
  }
  /** Snapshot at the initial GO, including final loadout and insertion. */
  captureBeforeExecution(session:Session,recorder:MissionRecorder):void{
    if(session.phase!=='planning')return;
    if(!session.started)this.currentStart=captureMissionStart(
      session,this.hooks.preferences().requestedSiteScale,this.selectedInsertion);
    recorder.capture(session,true);
  }
  /** A pre-GO restart uses the current gear/entry, not transient orders. */
  restartSnapshot(session:Session):MissionStartSnapshot{
    return session.started?this.start:
      captureMissionStart(session,this.hooks.preferences().requestedSiteScale,
        this.selectedInsertion);
  }
  restartRequest(start:MissionStartSnapshot):MissionCreation{
    return {
      variant:start.variant,seed:start.seed,
      missionOverride:start.missionType,
      prebuiltSite:siteForMissionRestart(start),
      restartStart:start
    };
  }
  /** Restore kit/identity before insertion. The authoritative deployment
   * validator alone decides whether a recorded entry remains reachable. */
  restoreStartingSetup(session:Session,start:MissionStartSnapshot,
    onInvalidEntry?:(entryId:string)=>void):void{
    restoreMissionStartingTeam(session,start);
    this.selectedInsertion='FRONT';
    if(start.entryId!=='FRONT'){
      if(selectDeployment(session,start.entryId))this.selectedInsertion=start.entryId;
      else onInvalidEntry?.(start.entryId);
    }
    this.currentStart=structuredClone(start);
    this.deploymentSession=session;
    this.deploymentOptions=availableDeployments(session)
      .filter(choice=>choice.id!=='FRONT');
  }
  /** The replay gets a distinct read-only presentation session. Never
   * mutate this controller's live start snapshot or selected entry. */
  createReplaySession(recorder:MissionRecorder,live:Session):Session{
    const manifest=recorder.manifest;
    const site=manifest?.site;
    const session=newSession(manifest?.variant??live.variant,
      site?.seed??live.site?.seed,
      manifest?.intelMode??live.intel.mode,
      site?.scale??live.site?.scale??'standard',
      manifest?.missionType,
      site?structuredClone(site):undefined);
    session.lightingMode=manifest?.lightingMode??live.lightingMode;
    session.operationDossier=manifest?.dossier?
      structuredClone(manifest.dossier):undefined;
    this.applyRequestedCondition(session,
      this.hooks.preferences().requestedCondition);
    this.hooks.applyRoster(session);
    applyReplayActorIdentity(session,manifest);
    return session;
  }
  /** Refresh the UI from session state, not inferred scene geometry. */
  refreshDeployment(session:Session,replaying:boolean):void{
    // Replay uses a temporary presentation Session. It must not consume
    // or reset the insertion selected for the paused live mission.
    if(replaying){
      if(this.controls){
        this.controls.button.hidden=true;this.controls.button.disabled=true;
      }
      return;
    }
    if(this.deploymentSession!==session){
      this.deploymentSession=session;
      this.selectedInsertion='FRONT';
      this.deploymentOptions=availableDeployments(session)
        .filter(choice=>choice.id!=='FRONT');
    }
    const controls=this.controls;
    if(!controls)return;
    const editable=session.phase==='planning'&&!session.started&&
      !replaying&&team(session).every(actor=>actor.plan.length===0);
    controls.button.hidden=!session.site||session.started||
      this.deploymentOptions.length===0;
    controls.button.disabled=!editable;
    controls.button.textContent='CHANGE ENTRY';
    controls.label.textContent=this.selectedInsertion==='FRONT'?
      'FRONT ENTRANCE':this.selectedInsertion.toUpperCase().replaceAll('-', ' ');
    controls.button.title=editable?
      'Cycle physically verified exterior entry points':
      'Select the insertion before plotting routes or starting GO';
  }
  /** Select only against breach-game's authoritative deployment rules. */
  selectNextDeployment(session:Session,replaying:boolean):boolean{
    this.refreshDeployment(session,replaying);
    if(session.phase!=='planning'||session.started||replaying||
      team(session).some(actor=>actor.plan.length>0))return false;
    const ids=['FRONT',...this.deploymentOptions.map(choice=>choice.id)];
    const next=ids[(ids.indexOf(this.selectedInsertion)+1)%ids.length];
    if(!selectDeployment(session,next))return false;
    this.selectedInsertion=next;
    if(session.operationDossier)session.operationDossier.identity.entryId=next;
    this.currentStart=captureMissionStart(
      session,this.hooks.preferences().requestedSiteScale,next);
    this.refreshDeployment(session,replaying);
    return true;
  }
  bindDeployment(controls:DeploymentControls):void{
    this.controls=controls;
    controls.button.addEventListener('click',()=>{
      const session=controls.getSession(),replaying=controls.isReplaying();
      this.refreshDeployment(session,replaying);
      if(controls.button.disabled||
        !this.selectNextDeployment(session,replaying))return;
      controls.onSelected();
      if(!controls.reducedMotion())
        controls.label.animate([
          {opacity:.5,transform:'translateY(2px)'},
          {opacity:1,transform:'translateY(0)'}
        ],{duration:180,easing:'ease-out'});
    });
  }
  /** Explicitly forget view cache when exiting a live tactical session. */
  releasePresentation():void{
    this.deploymentSession=null;
    this.deploymentOptions=[];
  }
}
