/** Single source of truth for the tactical palette's visible actions and their states. */
export type ContextAction={id:string;label:string;group:'primary'|'state'|'destructive';
  pressed?:boolean;disabled?:boolean;title?:string};
export type ContextOptions={door:boolean;node:boolean;flashRemaining:number;
  posture:'stand'|'crouch';pace:'walk'|'run';firePolicy:string;
  reserve:number;magazine:number};
export function contextActionChoices(o:ContextOptions):ContextAction[]{
  if(o.door)return [
    {id:'ctxOpen',label:'OPEN',group:'primary',title:'Queue door opening'},
    {id:'ctxKick',label:'KICK',group:'primary',title:'Force this door'},
    {id:'ctxDoorFlash',label:'FLASH ×'+o.flashRemaining,group:'primary',
      disabled:o.flashRemaining<=0,title:o.flashRemaining>0?'Flash through this door':'No flash grenades remaining'},
    {id:'ctxHold',label:'HOLD',group:'primary',title:'Hold door shut'},
  ];
  return [
    {id:'ctxLook',label:'LOOK',group:'primary',title:'Face a direction at this point'},
    {id:'ctxPie',label:'PIE',group:'primary',title:'Sweep a corner while moving'},
    {id:'ctxFlash',label:'FLASH ×'+o.flashRemaining,group:'primary',
      disabled:o.flashRemaining<=0,title:o.flashRemaining>0?'Choose a flash target':'No flash grenades remaining'},
    {id:'ctxWait',label:'WAIT',group:'primary',title:'Wait at this position'},
    {id:'ctxFocus',label:'FOCUS',group:'primary',title:'Focus fire on a target'},
    {id:'ctxSuppress',label:'SUPPRESS',group:'primary',title:'Suppress an area'},
    {id:'ctxFire',label:o.firePolicy.toUpperCase(),group:'state',
      pressed:o.firePolicy!=='engage',title:'Cycle rules of engagement'},
    {id:'ctxStance',label:o.posture.toUpperCase(),group:'state',
      pressed:o.posture==='crouch',title:'Toggle standing and crouching'},
    {id:'ctxPace',label:o.pace.toUpperCase(),group:'state',
      pressed:o.pace==='run',title:'Toggle walk and run'},
    {id:'ctxReload',label:'RELOAD',group:'state',
      disabled:o.reserve<=0,title:o.reserve<=0?'No reserve ammunition':'Queue a reload'},
    ...(o.node?[{id:'ctxDelete',label:'Delete',group:'destructive' as const,title:'Remove selected waypoint'}]:[]),
  ];
}
