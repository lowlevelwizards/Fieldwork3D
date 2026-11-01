/** Single source of truth for the tactical palette's visible actions and their states. */
export type ContextAction={id:string;label:string;group:'primary'|'state'|'destructive';
  pressed?:boolean;disabled?:boolean;title?:string};
export type ContextOptions={door:boolean;node:boolean;flashRemaining:number;
  posture:'stand'|'crouch';pace:'walk'|'run';firePolicy:string;
  reserve:number;magazine:number;doorOpen?:boolean;
  nodeKind?:string;aimLabel?:string;nodeFirePolicy?:string;
  nearMovable?:boolean;nearWindow?:boolean};
export function contextActionChoices(o:ContextOptions):ContextAction[]{
  if(o.door)return o.doorOpen?[
    {id:'ctxClose',label:'CLOSE',group:'primary',title:'Pull the open door shut'},
    {id:'ctxDoorFlash',label:'FLASH ×'+o.flashRemaining,group:'primary',
      disabled:o.flashRemaining<=0,title:'Flash through the doorway'},
  ]:[
    {id:'ctxOpen',label:'OPEN',group:'primary',title:'Queue door opening'},
    {id:'ctxKick',label:'KICK',group:'primary',title:'Force this door'},
    {id:'ctxDoorFlash',label:'FLASH ×'+o.flashRemaining,group:'primary',
      disabled:o.flashRemaining<=0,title:'Flash through this door'},
    {id:'ctxHold',label:'HOLD',group:'primary',title:'Brace this closed door'},
  ];
  return [
    {id:'ctxLook',label:'LOOK',group:'primary',pressed:o.nodeKind==='look'||o.aimLabel==='look',title:'Face a direction at this point'},
    {id:'ctxPie',label:'PIE',group:'primary',pressed:o.nodeKind==='pie',title:'Sweep a corner while moving'},
    {id:'ctxFlash',label:'FLASH ×'+o.flashRemaining,group:'primary',
      disabled:o.flashRemaining<=0,title:o.flashRemaining>0?'Choose a flash target':'No flash grenades remaining'},
    {id:'ctxWait',label:'WAIT',group:'primary',pressed:o.nodeKind==='wait'||o.nodeKind==='holdClear',title:'Wait at this position'},
    {id:'ctxFocus',label:'FOCUS',group:'primary',pressed:o.nodeFirePolicy==='focus',title:'Focus fire on a target'},
    {id:'ctxSuppress',label:'SUPPRESS',group:'primary',pressed:o.nodeFirePolicy==='suppress',title:'Suppress an area'},
    {id:'ctxFire',label:o.firePolicy.toUpperCase(),group:'state',
      pressed:o.firePolicy!=='engage',title:'Cycle rules of engagement'},
    {id:'ctxStance',label:o.posture.toUpperCase(),group:'state',
      pressed:o.posture==='crouch',title:'Toggle standing and crouching'},
    {id:'ctxPace',label:o.pace.toUpperCase(),group:'state',
      pressed:o.pace==='run',title:'Toggle walk and run'},
    {id:'ctxReload',label:'RELOAD',group:'state',
      disabled:o.reserve<=0,title:o.reserve<=0?'No reserve ammunition':'Queue a reload'},
    // Contextual fixtures append AFTER the stable primary order.
    ...(o.nearMovable?[{id:'ctxPush',label:'PUSH',group:'primary' as const,
      title:'Queue a physical push of nearby light furniture'}]:[]),
    ...(o.nearWindow?[{id:'ctxWindow',label:'WINDOW',group:'primary' as const,
      title:'Queue opening or closing the nearby window'}]:[]),
    ...(o.node?[{id:'ctxDelete',label:'Delete',group:'destructive' as const,title:'Remove selected waypoint'}]:[]),
  ];
}
