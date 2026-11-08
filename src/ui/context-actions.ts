/** Single source of truth for the tactical palette's visible actions and their states. */
export type ContextAction={id:string;label:string;group:'primary'|'advanced'|'state'|'destructive';
  pressed?:boolean;disabled?:boolean;title?:string};
export type ContextOptions={door:boolean;node:boolean;flashRemaining:number;
  posture:'stand'|'crouch';pace:'walk'|'run';firePolicy:string;
  reserve:number;magazine:number;doorOpen?:boolean;doorPartial?:boolean;
  nodeKind?:string;nodeMoveMode?:string;aimLabel?:string;nodeFirePolicy?:string;
  watchActive?:boolean;
  nearMovable?:boolean;nearWindow?:boolean;nearDoor?:boolean;
  treatTargetName?:string;
  nearCivilian?:boolean;escortableCivilian?:boolean;
  nearCivilianCasualty?:boolean;
  carryingCivilian?:boolean;
  availableTools?:readonly string[];doorWedged?:boolean;};
export function contextActionChoices(o:ContextOptions):ContextAction[]{
  if(o.door)return o.doorPartial?[
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
    ...(o.nearCivilian?[{id:'ctxSecureCivilian',label:'SECURE',
      group:'primary' as const,
      title:'Queue a physical reassurance and stay command'}]:[]),
    ...(o.escortableCivilian?[{id:'ctxFollowCivilian',label:'FOLLOW',
      group:'primary' as const,
      title:'Queue a physical rescue-person escort handoff'}]:[]),
    ...(o.carryingCivilian?[
      {id:'ctxReleaseCivilian',label:'RELEASE',group:'primary' as const,
       title:'Queue the physical release of the civilian you are carrying'}
    ]:[]),
    ...(o.nearCivilianCasualty?[
      {id:'ctxDragCivilian',label:'DRAG',group:'primary' as const,
       title:'Physically drag an incapacitated civilian to extraction'},
      {id:'ctxCarryCivilian',label:'CARRY',group:'primary' as const,
       title:'Physically carry an incapacitated civilian to extraction'}
    ]:[]),
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
      disabled:o.reserve<=0,title:o.reserve<=0?'No reserve ammunition':'Queue a reload'},
    // Contextual fixtures append AFTER the stable primary order.
    ...(o.nearMovable?[{id:'ctxPush',label:'PUSH',group:'advanced' as const,
      title:'Queue a physical push of nearby light furniture'}]:[]),
    ...(o.nearWindow?[{id:'ctxWindow',label:'WINDOW',group:'advanced' as const,
      title:'Queue opening or closing the reachable operable window'}]:[]),
    ...(o.node?[{id:'ctxDelete',label:'Delete',group:'destructive' as const,title:'Remove selected waypoint'}]:[]),
  ];
}
