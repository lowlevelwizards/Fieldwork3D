/** Single authority for temporary tactical target placement.
 * It never owns a plan node, session, pointer gesture or visible world query.
 * A target mode is a discriminated value: unrelated command payloads cannot
 * coexist, and new arming always replaces all stale modes atomically.
 */
export type FacingTargetMode='look'|'watch';
export type CasualtyTransport='drag'|'carry';
export type TacticalTargetMode=
 | Readonly<{kind:'none'}>
 | Readonly<{kind:FacingTargetMode;origin:'here'|'end'}>
 | Readonly<{kind:'flash';doorId:string|null}>
 | Readonly<{kind:'push'}>
 | Readonly<{kind:'suppress'}>
 | Readonly<{kind:'evac';patientId:string;transport:CasualtyTransport}>;

const NONE=Object.freeze({kind:'none'} as const);

export function createTacticalInteractionState(){
 let mode:TacticalTargetMode=NONE;
 // HUD may display the last LOOK/WATCH label after disarming. These are
 // presentation history only and never constitute another armed mode.
 let lastFacingMode:FacingTargetMode='look';
 let lastOrigin:'here'|'end'='end';
 const reset=():boolean=>{
  const wasArmed=mode.kind!=='none';mode=NONE;return wasArmed;
 };
 return {
  get mode():TacticalTargetMode{return mode;},
  get isArmed(){return mode.kind!=='none';},
  get isFacing(){return mode.kind==='look'||mode.kind==='watch';},
  get flashMode(){return mode.kind==='flash';},
  get flashDoorId(){return mode.kind==='flash'?mode.doorId:null;},
  get pushMode(){return mode.kind==='push';},
  get firePlacement(): 'suppress'|null{
   return mode.kind==='suppress'?'suppress':null;
  },
  get evacMode():{patientId:string;mode:CasualtyTransport}|null{
   return mode.kind==='evac'?
    {patientId:mode.patientId,mode:mode.transport}:null;
  },
  /** Read-only compatibility view for renderers and established HUD tests. */
  get facing():Readonly<{looking:boolean;lookMode:FacingTargetMode;armedOrigin:'here'|'end'}>{
   const looking=mode.kind==='look'||mode.kind==='watch';
   return Object.freeze({
    looking,lookMode:looking?mode.kind:lastFacingMode,
    armedOrigin:looking?mode.origin:lastOrigin
   });
  },
  /** LOOK/WATCH toggles off when the same tool is chosen twice; switching
   * between them replaces intent but does not alter authored WATCH orders.
   */
  toggleFacing(next:FacingTargetMode,selectedNode:number|null):boolean{
   if(mode.kind===next){reset();return false;}
   lastFacingMode=next;lastOrigin=selectedNode===null?'here':'end';
   mode=Object.freeze({kind:next,origin:lastOrigin});
   return true;
  },
  /** A second toolbar FLASH tap cancels; contextual door FLASH always
   * explicitly replaces the target and cannot inherit an old door.
   */
  toggleFlash():boolean{
   if(mode.kind==='flash'){reset();return false;}
   mode=Object.freeze({kind:'flash',doorId:null});return true;
  },
  armDoorFlash(doorId:string):void{
   mode=Object.freeze({kind:'flash',doorId});
  },
  armPush():void{mode=Object.freeze({kind:'push'});},
  armSuppress():void{mode=Object.freeze({kind:'suppress'});},
  armEvac(patientId:string,transport:CasualtyTransport):void{
   mode=Object.freeze({kind:'evac',patientId,transport});
  },
  /** Clear transient intent. Back/Cancel must call this before any
   * waypoint edits; invalid targets leave mode armed unless caller chooses
   * the existing one-shot evacuation behavior.
   */
  cancel:reset,
  reset,
  /** HUD-only display value, never an order. */
  get label():string{
   switch(mode.kind){
    case 'none':return '';
    case 'look':return 'LOOK';
    case 'watch':return 'WATCH';
    case 'flash':return 'FLASH';
    case 'push':return 'PUSH';
    case 'suppress':return 'SUPPRESS';
    case 'evac':return mode.transport==='drag'?'DRAG':'CARRY';
   }
  }
 };
}
export type TacticalInteractionState=ReturnType<typeof createTacticalInteractionState>;
