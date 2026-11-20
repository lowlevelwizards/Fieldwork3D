/** Single source of truth for the tactical palette's visible actions and their states. */
import type {StackFormation} from '../breach-entry-coordination.ts';
export type ContextAction={id:string;label:string;group:'primary'|'advanced'|'state'|'destructive';
  pressed?:boolean;disabled?:boolean;title?:string};
export type ContextOptions={door:boolean;node:boolean;flashRemaining:number;
  posture:'stand'|'crouch';pace:'walk'|'run';firePolicy:string;
  reserve:number;magazine:number;doorOpen?:boolean;doorPartial?:boolean;
  formationEditable?:boolean;stackFormation?:StackFormation;
  secondaryIssued?:boolean;secondaryHand?:'primary'|'secondary';
  secondaryReloadAvailable?:boolean;
  nodeKind?:string;nodeMoveMode?:string;aimLabel?:string;nodeFirePolicy?:string;
  watchActive?:boolean;
  nearMovable?:boolean;nearWindow?:boolean;nearDoor?:boolean;
  powerActions?:readonly ContextAction[];
  treatTargetName?:string;
  nearCivilian?:boolean;escortableCivilian?:boolean;
  stopFollowingCivilian?:boolean;
  nearRestrainableCivilian?:boolean;restraintsRemaining?:number;
  nearSuspect?:boolean;nearRestrainableSuspect?:boolean;
  nearSearchableSuspect?:boolean;nearDroppedFirearm?:boolean;
  nearEscortableSuspect?:boolean;nearFollowingSuspect?:boolean;
  nearCivilianCasualty?:boolean;nearDownedCaptureTarget?:boolean;
  carryingCivilian?:boolean;
  availableTools?:readonly string[];doorWedged?:boolean;
  /** A prior witnessed interruption exists; not a query of current hidden lock state. */
  resumeAvailable?:boolean;
  resumeSquadAvailable?:boolean;
  /** Based only on the previously witnessed interruption. */
  resumeReason?:'locked'|'jammed'|'coordinated';};
export function contextActionChoices(o:ContextOptions):ContextAction[]{
 if(o.resumeAvailable)return [
  {id:'ctxResumeEntry',label:'RESUME ENTRY',group:'primary',
   title:o.resumeReason==='coordinated'?
     'A teammate was stopped at this threshold · deliberately retry your preserved entry':
     'Previously blocked entry · resolve its obstruction, then deliberately retry'},
  ...(o.resumeSquadAvailable?[{id:'ctxResumeSquad',label:'RESUME SQUAD',
    group:'primary' as const,
    title:'Explicitly restore the previously interrupted same-door squad orders'}]:[]),
  ...contextActionChoices({...o,resumeAvailable:false,resumeSquadAvailable:false})
 ];
  if(o.door){
  const formation:ContextAction[]=o.formationEditable?[
    {id:'ctxFormationCycle',label:'FORMATION · '+
      (o.stackFormation??'auto').toUpperCase(),group:'advanced',
      title:'Choose AUTO, LEFT, RIGHT, SPLIT 2+2 or 45° ANGLED stack; no plan is changed'},
    {id:'ctxStackTeam',label:'STACK SQUAD',group:'advanced',
      title:'Queue the squad to physically reachable, distinct '+
        (o.stackFormation??'auto').toUpperCase()+' stack positions'},
    {id:'ctxSquadEntry',label:'SQUAD ENTRY',group:'advanced',
      title:'Plan synchronized entry using the '+
        (o.stackFormation??'auto').toUpperCase()+' stack layout'}
  ]:[];
  const doorActions:ContextAction[]=o.doorPartial?[
     {id:'ctxOpen',label:'OPEN MORE',group:'primary',title:'Continue swinging this partially open door'},
     {id:'ctxClose',label:'CLOSE',group:'primary',title:'Swing this door toward its frame'},
     {id:'ctxDoorFlash',label:'FLASH ×'+o.flashRemaining,group:'primary',
       disabled:o.flashRemaining<=0,title:'Flash through this doorway'},
   ]:o.doorOpen?[
    {id:'ctxClose',label:'CLOSE',group:'primary',title:'Pull the open door shut'},
    {id:'ctxDoorFlash',label:'FLASH ×'+o.flashRemaining,group:'primary',
      disabled:o.flashRemaining<=0,title:'Flash through the doorway'},
  ]:[
    {id:'ctxOpen',label:'OPEN',group:'primary',title:'Queue door opening'},
    {id:'ctxKick',label:'KICK',group:'primary',title:'Force this door'},
    {id:'ctxDoorFlash',label:'FLASH ×'+o.flashRemaining,group:'primary',
      disabled:o.flashRemaining<=0,title:'Flash through this door'},
    ...(o.availableTools??[]).map(method=>({id:'ctxTool-'+method,
     label:method.toUpperCase(),group:'primary' as const,
     title:'Use equipped '+method+' tool at door'})), 
  ];
  return [...doorActions,...formation];
 }
  return [
    {id:'ctxLook',label:'LOOK',group:'primary',pressed:o.aimLabel==='look',
      title:'Check a direction briefly, then resume natural movement-facing'},
    {id:'ctxWatch',label:'WATCH',group:'primary',pressed:o.watchActive,
      title:'Keep watching a chosen point as you move until released'},
    {id:'ctxWait',label:'WAIT',group:'primary',
      pressed:o.nodeKind==='wait'||o.nodeKind==='holdClear',title:'Wait at this position'},
    ...(o.treatTargetName?[{id:'ctxTreat',label:'TREAT',group:'primary' as const,
      title:'Queue medical treatment for '+o.treatTargetName}]:[]),
    ...(o.nearDoor?[{id:'ctxDoor',label:'DOOR',group:'primary' as const,
      title:'Show actions for a reachable door'}]:[]),
    ...(o.powerActions??[]),
    ...(o.nearSuspect?[{id:'ctxChallengeSuspect',label:'CHALLENGE',
      group:'primary' as const,
      title:'Issue a timed verbal challenge to a visibly identified suspect; compliance is not guaranteed'}]:[]),
    ...(o.nearRestrainableSuspect&&Number(o.restraintsRemaining)>0?
      [{id:'ctxRestrainSuspect',label:'RESTRAIN SUSPECT ×'+o.restraintsRemaining,
        group:'primary' as const,
        title:'Physically apply one issued pair of flex cuffs to the compliant suspect'}]:[]),
    ...(o.nearSearchableSuspect?[{id:'ctxSearchSuspect',label:'SEARCH SUSPECT',
      group:'primary' as const,
      title:'Search a physically restrained person and confiscate carried sidearms'}]:[]),
    ...(o.nearDroppedFirearm?[{id:'ctxSecureFirearm',label:'SECURE WEAPON',
      group:'primary' as const,
      title:'Secure an actual visible dropped firearm through physical contact'}]:[]),
    ...(o.nearEscortableSuspect?[{id:'ctxEscortSuspect',label:'ESCORT SUSPECT',
      group:'primary' as const,title:'Voice-order a physically restrained suspect to follow this operator'}]:[]),
    ...(o.nearFollowingSuspect?[{id:'ctxStopEscortSuspect',label:'STOP ESCORT',
      group:'primary' as const,title:'Tell a restrained suspect to hold their actual position'}]:[]),
    ...(o.nearCivilian?[{id:'ctxSecureCivilian',label:'SECURE',
      group:'primary' as const,
      title:'Queue a physical reassurance and stay command'}]:[]),
    ...(o.nearRestrainableCivilian&&Number(o.restraintsRemaining)>0?
      [{id:'ctxRestrainCivilian',label:'RESTRAIN ×'+o.restraintsRemaining,
        group:'primary' as const,
        title:'Secure this compliant, unrestrained person with one physically carried pair of flex cuffs'}]:[]),
    ...(o.escortableCivilian?[{id:'ctxFollowCivilian',label:'FOLLOW',
      group:'primary' as const,
      title:'Call a visible rescue person to follow within unobstructed voice range'}]:[]),
    ...(o.stopFollowingCivilian?[{id:'ctxStopFollowingCivilian',
      label:'STOP FOLLOWING',group:'primary' as const,
      title:'Tell the escorted person to hold position until told to follow again'}]:[]),
    ...(o.carryingCivilian?[
      {id:'ctxReleaseCivilian',label:'RELEASE',group:'primary' as const,
       title:'Queue the physical release of the civilian you are carrying'}
    ]:[]),
    ...(o.nearDownedCaptureTarget?[
      {id:'ctxDragCapture',label:'DRAG CAPTURE TARGET',group:'primary' as const,
       title:'Physically drag the designated incapacitated target to extraction'},
      {id:'ctxCarryCapture',label:'CARRY CAPTURE TARGET',group:'primary' as const,
       title:'Physically carry the designated incapacitated target to extraction'}
    ]:[]),
    ...(o.nearCivilianCasualty?[
      {id:'ctxDragCivilian',label:'DRAG',group:'primary' as const,
       title:'Physically drag an incapacitated civilian to extraction'},
      {id:'ctxCarryCivilian',label:'CARRY',group:'primary' as const,
       title:'Physically carry an incapacitated civilian to extraction'}
    ]:[]),
    ...(o.secondaryIssued?[{id:'ctxSwitchWeapon',group:'advanced' as const,
      label:o.secondaryHand==='secondary'?'HOLSTER SIDEARM':'DRAW SIDEARM',
      title:o.secondaryHand==='secondary'?
        'Plan return to primary at this waypoint':
        'Plan drawing the actual issued pistol at this waypoint'}]:[]),
    {id:'ctxFlash',label:'FLASH ×'+o.flashRemaining,group:'advanced',
      disabled:o.flashRemaining<=0,title:o.flashRemaining>0?'Choose a flash target':'No flash grenades remaining'},
    {id:'ctxSuppress',label:'SUPPRESS',group:'advanced',
      pressed:o.nodeFirePolicy==='suppress',title:'Suppress an area'},
    {id:'ctxFire',label:o.firePolicy.toUpperCase(),group:'state',
      pressed:o.firePolicy!=='engage',title:'Cycle rules of engagement'},
    {id:'ctxStance',label:o.posture.toUpperCase(),group:'state',
      pressed:o.posture==='crouch',title:'Toggle standing and crouching'},
    {id:'ctxPace',label:o.pace.toUpperCase(),group:'state',
      pressed:o.pace==='run',title:'Toggle walk and run'},
    {id:'ctxReload',label:'RELOAD',group:'state',
      disabled:o.secondaryHand==='secondary'?
        !o.secondaryReloadAvailable:o.reserve<=0,
      title:o.secondaryHand==='secondary'?
        o.secondaryReloadAvailable?'Reload from an issued accessible pistol magazine':
        'No accessible pistol magazine with more rounds':
        o.reserve<=0?'No reserve ammunition':'Queue a reload'},
    // Contextual fixtures append AFTER the stable primary order.
    ...(o.nearMovable?[{id:'ctxPush',label:'PUSH',group:'advanced' as const,
      title:'Queue a physical push of nearby light furniture'}]:[]),
    ...(o.nearWindow?[{id:'ctxWindow',label:'WINDOW',group:'advanced' as const,
      title:'Queue opening or closing the reachable operable window'}]:[]),
    ...(o.node?[{id:'ctxDelete',label:'Delete',group:'destructive' as const,title:'Remove selected waypoint'}]:[]),
  ];
}
