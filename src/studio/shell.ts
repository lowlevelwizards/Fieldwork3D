import {createStudioNavigation,type StudioContext,type StudioRoute,type StudioWeaponSlot,type StudioWorkspace} from './navigation.ts';

/** A mounted workspace owns its listeners and resources. update must not remount. */
export type StudioWorkspaceView={update:(route:StudioRoute)=>void;dispose:()=>void};
export type StudioWorkspaceActions=Readonly<{
 selectOperator:(id:string|null,category?:string|null)=>boolean;
 selectCategory:(category:string|null)=>boolean;
 openArsenal:(slot?:StudioWeaponSlot|null)=>boolean;
 back:()=>boolean;
 close:()=>boolean;
}>;
export type StudioWorkspaceMount=(host:HTMLElement,route:StudioRoute,actions:StudioWorkspaceActions)=>StudioWorkspaceView;
export type StudioShellOptions=Readonly<{
 context:StudioContext;
 workspaces:Readonly<Record<StudioWorkspace,StudioWorkspaceMount>>;
 canLeave:(from:StudioRoute,to:StudioRoute|null)=>boolean;
 onClose:(context:StudioContext)=>void;
 onError?:(error:unknown)=>void;
}>;
const occupiedHosts=new WeakSet<HTMLElement>();

/** SU2.2: opt-in DOM shell. No gameplay writes, global navigation or renderer allocation. */
export function mountStudioShell(host:HTMLElement,options:StudioShellOptions){
 if(occupiedHosts.has(host))throw new Error('Studio already mounted in this host');
 const doc=host.ownerDocument,previousFocus=doc.activeElement as HTMLElement|null;
 const root=doc.createElement('section');root.className='fw-studio-shell';root.setAttribute('aria-label','Studio');
 const header=doc.createElement('header');header.className='fw-studio-header';
 const title=doc.createElement('h1');title.textContent='STUDIO';
 const tabs=doc.createElement('nav');tabs.setAttribute('aria-label','Studio workspaces');
 const button=(label:string)=>{const el=doc.createElement('button');el.type='button';el.textContent=label;return el;};
 const back=button('Back'),operators=button('Operators'),arsenal=button('Arsenal');
 const body=doc.createElement('div');body.className='fw-studio-workspace';
 const status=doc.createElement('p');status.setAttribute('role','status');status.hidden=true;
 const retry=button('Retry');retry.hidden=true;
 tabs.append(operators,arsenal);header.append(back,title,tabs);root.append(header,status,retry,body);
 let active:StudioWorkspaceView|null=null,kind:StudioWorkspace|null=null,generation=0,disposed=false;
 const report=(error:unknown)=>{try{options.onError?.(error);}catch{/* reporting must not break teardown */}};
 function retire(){
  generation++;const old=active;active=null;kind=null;
  try{old?.dispose();}catch(error){report(error);}finally{body.replaceChildren();}
 }
 function destroy(){
  if(disposed)return;disposed=true;const restore=root.contains(doc.activeElement);
  retire();root.remove();occupiedHosts.delete(host);
  if(restore&&previousFocus?.isConnected)previousFocus.focus();
 }
 const nav=createStudioNavigation(options.context,{
  canLeave:(from,to)=>!disposed&&options.canLeave(from,to),
  onRoute:render,
  onClose:context=>{destroy();options.onClose(context);}
 });
 function render(route:StudioRoute){
  if(disposed)return;
  operators.setAttribute('aria-pressed',String(route.workspace==='operators'));
  arsenal.setAttribute('aria-pressed',String(route.workspace==='arsenal'));
  root.dataset.workspace=route.workspace;status.hidden=true;retry.hidden=true;
  const moveFocus=kind!==route.workspace&&body.contains(doc.activeElement);
  try{
   if(active&&kind===route.workspace){active.update(route);return;}
   retire();const token=generation;
   const guard=(fn:()=>boolean)=>!disposed&&token===generation&&active!==null&&fn();
   const actions:StudioWorkspaceActions=Object.freeze({
    selectOperator:(id:string|null,category?:string|null)=>guard(()=>nav.selectOperator(id,category)),
    selectCategory:(category:string|null)=>guard(()=>nav.selectCategory(category)),
    openArsenal:(slot?:StudioWeaponSlot|null)=>guard(()=>nav.openArsenal(slot)),
    back:()=>guard(nav.back),close:()=>guard(nav.close)
   });
   // A mount that throws is responsible for any resources it allocated before returning.
   const view=options.workspaces[route.workspace](body,route,actions);
   if(disposed||token!==generation){view.dispose();return;}
   active=view;kind=route.workspace;
  }catch(error){
   retire();report(error);status.textContent='Workspace unavailable.';status.hidden=false;retry.hidden=false;
  }finally{
   if(moveFocus&&!disposed)(route.workspace==='operators'?operators:arsenal).focus();
  }
 }
 back.addEventListener('click',()=>nav.back());
 operators.addEventListener('click',()=>{if(nav.route.workspace==='arsenal')nav.back();});
 arsenal.addEventListener('click',()=>{if(nav.route.workspace==='operators')nav.openArsenal();});
 retry.addEventListener('click',()=>render(nav.route));
 root.addEventListener('keydown',event=>{
  if(event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();nav.back();}
 });
 occupiedHosts.add(host);host.append(root);render(nav.route);
 if(!disposed)back.focus();
 return {get route(){return nav.route;},get disposed(){return disposed;},
  selectOperator:(id:string|null,category?:string|null)=>!disposed&&nav.selectOperator(id,category),
  selectCategory:(category:string|null)=>!disposed&&nav.selectCategory(category),
  openArsenal:(slot?:StudioWeaponSlot|null)=>!disposed&&nav.openArsenal(slot),
  back:()=>!disposed&&nav.back(),close:()=>!disposed&&nav.close(),dispose:destroy};
}
