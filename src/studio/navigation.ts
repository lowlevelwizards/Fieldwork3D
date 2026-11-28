/** SU2.1: presentation-only navigation. The mode owner retains all mutation authority. */
export type StudioMode='standalone'|'quick'|'campaign';
export type StudioWorkspace='operators'|'arsenal';
export type StudioWeaponSlot='primary'|'secondary';
export type OperatorRoute=Readonly<{workspace:'operators';operatorId:string|null;category:string|null}>;
export type ArsenalRoute=Readonly<{workspace:'arsenal';operatorId:string|null;slot:StudioWeaponSlot|null}>;
export type StudioRoute=OperatorRoute|ArsenalRoute;
export type StudioContext=Readonly<{mode:StudioMode;operatorId:string|null;returnTo:string}>;
export type StudioNavigationPorts=Readonly<{
 canLeave:(from:StudioRoute,to:StudioRoute|null)=>boolean;
 onRoute:(route:StudioRoute)=>void;
 onClose:(context:StudioContext)=>void;
}>;
const copyRoute=(route:StudioRoute):StudioRoute=>Object.freeze({...route});
const operators=(operatorId:string|null,category:string|null=null):OperatorRoute=>
 Object.freeze({workspace:'operators',operatorId,category});
const sameRoute=(a:StudioRoute,b:StudioRoute):boolean=>a.workspace===b.workspace&&
 a.operatorId===b.operatorId&&(a.workspace==='operators'&&b.workspace==='operators'?
 a.category===b.category:a.workspace==='arsenal'&&b.workspace==='arsenal'&&a.slot===b.slot);

export function createStudioNavigation(input:StudioContext,ports:StudioNavigationPorts){
 const context:StudioContext=Object.freeze({...input});
 if(context.mode!=='standalone'&&!context.operatorId)throw new Error('Contextual Studio requires an operator');
 let route:StudioRoute=operators(context.operatorId);
 let returnRoute:OperatorRoute|null=null;
 let closed=false,transitioning=false;
 function change(next:StudioRoute,nextReturn:OperatorRoute|null):boolean{
  if(closed||transitioning)return false;
  if(sameRoute(route,next))return true;
  transitioning=true;
  try{
   if(!ports.canLeave(route,next))return false;
   route=copyRoute(next);returnRoute=nextReturn;ports.onRoute(route);return true;
  }finally{transitioning=false;}
 }
 function selectOperator(id:string|null,category:string|null=null):boolean{
  if(context.mode!=='standalone'&&!id)return false;
  return change(operators(id,category),null);
 }
 function selectCategory(category:string|null):boolean{
  if(route.workspace!=='operators')return false;
  return change(operators(route.operatorId,category),null);
 }
 function openArsenal(slot:StudioWeaponSlot|null=null):boolean{
  if(closed||transitioning)return false;
  if(slot&&!route.operatorId)return false;
  const previous=route.workspace==='operators'?route:returnRoute;
  return change({workspace:'arsenal',operatorId:route.operatorId,slot},previous);
 }
 function back():boolean{
  if(closed||transitioning)return false;
  return route.workspace==='arsenal'?
   change(returnRoute??operators(route.operatorId),null):close();
 }
 function close():boolean{
  if(closed||transitioning)return false;
  transitioning=true;
  try{
   if(!ports.canLeave(route,null))return false;
   closed=true;returnRoute=null;ports.onClose(context);return true;
  }finally{transitioning=false;}
 }
 return {get route(){return route;},get context(){return context;},get closed(){return closed;},
  selectOperator,selectCategory,openArsenal,back,close};
}
export type StudioNavigation=ReturnType<typeof createStudioNavigation>;
