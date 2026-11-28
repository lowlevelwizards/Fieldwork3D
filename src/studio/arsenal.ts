import {mountArsenalGallery,type ArsenalGalleryOptions} from '../arsenal/gallery-main.ts';
import type {ArsenalRoute,StudioRoute} from './navigation.ts';
import type {StudioWorkspaceMount} from './shell.ts';

type Embedded=Extract<ArsenalGalleryOptions,{embedded:true}>;
type PrimaryOpen=Embedded['openPrimary'];
type SecondaryOpen=Embedded['secondaryOpen'];
export type StudioArsenalPorts=Readonly<{
 openPrimary:(route:ArsenalRoute,...args:Parameters<PrimaryOpen>)=>void;
 openGlock:(route:ArsenalRoute,...args:Parameters<SecondaryOpen['glock']>)=>void;
 openM9:(route:ArsenalRoute,...args:Parameters<SecondaryOpen['m9']>)=>void;
}>;

/** Gallery-only integration. Workbench ownership stays with the supplied host;
 * never launch a standalone overlay implicitly from an embedded workspace. */
export function createStudioArsenal(ports:StudioArsenalPorts,
 mountGallery:typeof mountArsenalGallery=mountArsenalGallery):StudioWorkspaceMount{
 return (host,initial,actions)=>{
  if(initial.workspace!=='arsenal')throw new Error('Arsenal route required');
  let route=initial,disposed=false;
  const gallery=mountGallery(host,{
   embedded:true,initialCategory:route.slot??'primary',
   onSelectCategory:category=>!disposed&&(route.slot===null||actions.openArsenal(category)),
   openPrimary:(source,refresh)=>{if(!disposed&&(route.slot===null||route.slot==='primary'))
    ports.openPrimary(route,source,id=>{if(!disposed)refresh(id);});},
   secondaryOpen:{
    glock:(recipe,refresh)=>{if(!disposed&&(route.slot===null||route.slot==='secondary'))
     ports.openGlock(route,recipe,()=>{if(!disposed)refresh();});},
    m9:id=>{if(!disposed&&(route.slot===null||route.slot==='secondary'))ports.openM9(route,id);}
   }
  });
  return {
   update(next:StudioRoute){
    if(disposed)return;if(next.workspace!=='arsenal')throw new Error('Arsenal route required');
    const changed=route.slot!==next.slot;route=next;
    if(changed&&route.slot)gallery.showCategory(route.slot);
   },
   dispose(){if(disposed)return;disposed=true;gallery.dispose();}
  };
 };
}
