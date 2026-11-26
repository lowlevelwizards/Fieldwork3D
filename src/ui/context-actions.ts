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
  nearMovable?:boolean;nearWindow?:boolean;nearWindowOpen?:boolean;nearDoor?:boolean;
  powerActions?:readonly ContextAction[];
  treatTargetName?:string;treatCaptureTarget?:boolean;
  nearCivilian?:boolean;escortableCivilian?:boolean;
  stopFollowingCivilian?:boolean;
  nearRestrainableCivilian?:boolean;restraintsRemaining?:number;
  nearSuspect?:boolean;nearRestrainableSuspect?:boolean;
  nearSearchableSuspect?:boolean;nearDroppedFirearm?:boolean;
  nearEscortableSuspect?:boolean;nearFollowingSuspect?:boolean;
  nearCivilianCasualty?:boolean;nearDownedCaptureTarget?:boolean;
  carryingCivilian?:boolean;carryingCaptureTarget?:boolean;
  availableTools?:readonly string[];doorWedged?:boolean;
  /** A prior witnessed interruption exists; not a query of current hidden lock state. */
  resumeAvailable?:boolean;
  resumeSquadAvailable?:boolean;
  /** Based only on the previously witnessed interruption. */
  resumeReason?:'locked'|'jammed'|'coordinated';};
export function contextActionChoices(o:ContextOptions):ContextAction[]{
 // Stack layouts and recovery are automatic AI procedures, not menu actions.
 if(o.door){
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
     label:method==='pick'?'PICK LOCK':
       method==='unwedge'?'REMOVE WEDGE':
       method==='breach'?'BREACH DOOR':
       method==='ram'?'RAM DOOR':method.toUpperCase(),
     group:'primary' as const,
     title:'Use equipped '+method+' tool at door'})), 
  ];
  return doorActions;
 }
  return [
    {id:'ctxLook',label:'LOOK',group:'primary',pressed:o.aimLabel==='look',
      title:'Check a direction briefly, then resume natural movement-facing'},
    {id:'ctxWatch',label:'WATCH',group:'primary',pressed:o.watchActive,
      title:'Keep watching a chosen point as you move until released'},
    {id:'ctxWait',label:'WAIT',group:'primary',
      pressed:o.nodeKind==='wait'||o.nodeKind==='holdClear',title:'Wait at this position'},
    ...(o.treatTargetName?[{id:'ctxTreat',
      label:'TREAT',
      group:'primary' as const,
      title:'Choose self or a nearby patient; review bleeding and available medical supplies'}]:[]),
    ...(o.nearDoor?[{id:'ctxDoor',label:'DOOR ACTIONS',group:'primary' as const,
      title:'Show actions for a reachable door'}]:[]),
    ...(o.powerActions??[]),
    ...(o.nearSuspect?[{id:'ctxChallengeSuspect',label:'CHALLENGE',
      group:'primary' as const,
      title:'Issue a timed verbal challenge to a visibly identified suspect; compliance is not guaranteed'}]:[]),
    ...(o.nearRestrainableSuspect?
      [{id:'ctxRestrainSuspect',label:'RESTRAIN SUSPECT',
        group:'primary' as const,
        title:'Physically restrain a compliant suspect without loadout stock'}]:[]),
    ...(o.nearSearchableSuspect?[{id:'ctxSearchSuspect',label:'SEARCH SUSPECT',
      group:'primary' as const,
      title:'Search a physically restrained person and confiscate carried sidearms'}]:[]),
    ...(o.nearDroppedFirearm?[{id:'ctxSecureFirearm',label:'SECURE WEAPON',
      group:'primary' as const,
      title:'Secure an actual visible dropped firearm through physical contact'}]:[]),
    ...(o.nearEscortableSuspect?[{id:'ctxEscortSuspect',label:o.escortableCivilian?'FOLLOW SUSPECT':'FOLLOW ME',
      group:'primary' as const,title:'Tell a cooperative surrendered suspect to stand with hands raised and follow'}]:[]),
    ...(o.nearFollowingSuspect?[{id:'ctxStopEscortSuspect',label:o.stopFollowingCivilian?'SUSPECT STAY':'STAY HERE',
      group:'primary' as const,title:'Tell a following suspect to stop and hold their actual position'}]:[]),
    ...(o.nearCivilian?[{id:'ctxSecureCivilian',label:'REASSURE',
      group:'primary' as const,
      title:'Queue a physical reassurance and stay command'}]:[]),
    ...(o.nearRestrainableCivilian?
      [{id:'ctxRestrainCivilian',label:'RESTRAIN',
        group:'primary' as const,
        title:'Physically restrain this compliant person; no consumable required'}]:[]),
    ...(o.escortableCivilian?[{id:'ctxFollowCivilian',label:o.nearEscortableSuspect?'FOLLOW CIVILIAN':'FOLLOW ME',
      group:'primary' as const,
      title:'Call a visible rescue person to follow within unobstructed voice range'}]:[]),
    ...(o.stopFollowingCivilian?[{id:'ctxStopFollowingCivilian',
      label:o.nearFollowingSuspect?'CIVILIAN STAY':'STAY HERE',group:'primary' as const,
      title:'Tell the escorted person to hold position until told to follow again'}]:[]),
    ...(o.carryingCivilian?[
      {id:'ctxReleaseCivilian',label:'SET DOWN',group:'primary' as const,
       title:'Queue the physical release of the civilian you are carrying'}
    ]:[]),
    ...(o.carryingCaptureTarget?[
      {id:'ctxReleaseCapture',label:'SET DOWN TARGET',group:'primary' as const,
       title:'Release the physically held downed target at its actual position'}
    ]:[]),
    ...(o.nearDownedCaptureTarget?[
      {id:'ctxDragCapture',label:'DRAG TARGET',group:'primary' as const,
       title:'Pick up and drag; use ordinary movement until SET DOWN'},
      {id:'ctxCarryCapture',label:'CARRY TARGET',group:'primary' as const,
       title:'Pick up and carry; use ordinary movement until SET DOWN'}
    ]:[]),
    ...(o.nearCivilianCasualty?[
      {id:'ctxDragCivilian',label:'DRAG',group:'primary' as const,
       title:'Pick up and drag; use ordinary movement until SET DOWN'},
      {id:'ctxCarryCivilian',label:'CARRY',group:'primary' as const,
       title:'Pick up and carry; use ordinary movement until SET DOWN'}
    ]:[]),
    ...(o.secondaryIssued?[{id:'ctxSwitchWeapon',group:'advanced' as const,
      label:o.secondaryHand==='secondary'?'SWITCH TO PRIMARY':'DRAW SIDEARM',
      title:o.secondaryHand==='secondary'?
        'Plan return to primary at this waypoint':
        'Plan drawing the actual issued pistol at this waypoint'}]:[]),
    {id:'ctxFlash',label:'FLASH ×'+o.flashRemaining,group:'advanced',
      disabled:o.flashRemaining<=0,title:o.flashRemaining>0?'Choose a flash target':'No flash grenades remaining'},
    {id:'ctxSuppress',label:'SUPPRESS',group:'advanced',
      pressed:o.nodeFirePolicy==='suppress',title:'Suppress an area'},
    {id:'ctxFire',label:o.firePolicy==='hold'?'HOLD FIRE':
      o.firePolicy==='return'?'RETURN FIRE':o.firePolicy.toUpperCase(),group:'state',
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
    ...(o.nearWindow?[{id:'ctxWindow',
      label:o.nearWindowOpen?'CLOSE WINDOW':'OPEN WINDOW',
      group:'advanced' as const,
      title:o.nearWindowOpen?'Queue closing the observed operable window':
        'Queue opening the observed operable window'}]:[]),
    ...(o.node?[{id:'ctxDelete',label:'DELETE POINT',group:'destructive' as const,title:'Remove selected waypoint'}]:[]),
  ];
}
