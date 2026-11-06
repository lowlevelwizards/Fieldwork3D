/** Shared mobile-friendly factory model browser; campaign ownership stays outside. */
import {FAMILY_PRESETS,type WeaponFamilyPreset,type WeaponFamily}
 from '../equipment-weapon-families.ts';
export function createWeaponPresetBrowser(options:{
 selectedId?:string|null;selectedFamily?:WeaponFamily|null;
 onSelect:(id:string)=>void;
 availability?:(preset:WeaponFamilyPreset)=>string|null;
}):HTMLDetailsElement{
 const chosen=FAMILY_PRESETS.find(p=>p.id===options.selectedId);
 let family:WeaponFamily=chosen?.family??options.selectedFamily??'ar';
 const outer=document.createElement('details');
 outer.className='fw-weapon-model-browser';outer.dataset.weaponPresetBrowser='true';
 outer.style.cssText='border:1px solid #658276;border-radius:9px;padding:9px;margin:10px 0;background:#1b3029';
 outer.open=!chosen;
 const heading=document.createElement('summary');
 heading.textContent='FACTORY MODELS · '+FAMILY_PRESETS.length+
  (chosen?' · '+chosen.name.toUpperCase():' · SELECT MODEL');
 heading.style.cssText='cursor:pointer;padding:8px 0;min-height:36px;font-weight:700;color:#e6eada';
 outer.append(heading);
 const hint=document.createElement('p');hint.className='fw-weapon-helper';
 hint.textContent='Browse AR, AK and HK variants. Switching rifle/carbine class follows the current mode’s equipment rules.';
 outer.append(hint);
 const tabs=document.createElement('div');tabs.style.cssText='display:flex;flex-wrap:wrap;gap:7px;margin:9px 0';
 const families=[...new Set(FAMILY_PRESETS.map(p=>p.family))]
  .sort((a,b)=>a==='ar'?-1:b==='ar'?1:a.localeCompare(b));
 const grid=document.createElement('div');grid.className='fw-weapon-preset-grid';
 grid.style.cssText='display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px';
 const draw=()=>{
  tabs.replaceChildren();grid.replaceChildren();
  for(const f of families){
   const tab=document.createElement('button');tab.type='button';
   tab.textContent=f.toUpperCase()+' · '+FAMILY_PRESETS.filter(p=>p.family===f).length;
   tab.setAttribute('aria-pressed',String(f===family));
   tab.style.cssText='flex:1 1 84px;min-height:42px;border:1px solid #81998a;border-radius:7px;'+
    'background:'+(f===family?'#b1c5aa':'#2c4038')+
    ';color:'+(f===family?'#182820':'#e5e9dd')+';font-weight:700';
   tab.addEventListener('click',()=>{family=f;draw()});tabs.append(tab);
  }
  for(const p of FAMILY_PRESETS.filter(p=>p.family===family)){
   const reason=options.availability?.(p)??null;
   const button=document.createElement('button');button.type='button';
   button.textContent=p.name;button.dataset.weaponPreset=p.id;
   button.disabled=Boolean(reason);
   button.setAttribute('aria-pressed',String(p.id===options.selectedId));
   button.title=reason??p.weapon.toUpperCase();
   button.setAttribute('aria-label',p.name+' '+p.weapon+(reason?' unavailable: '+reason:''));
   button.style.cssText='min-width:0;min-height:44px;padding:7px 3px;'+
    'border:1px solid #829788;border-radius:7px;'+
    'background:'+(p.id===options.selectedId?'#b1c5aa':'#293f35')+
    ';color:'+(p.id===options.selectedId?'#192820':'#e5e9dd')+
    ';font-weight:700;opacity:'+(reason?'.4':'1');
   button.addEventListener('click',()=>options.onSelect(p.id));grid.append(button);
  }
 };draw();outer.append(tabs,grid);return outer;
}
