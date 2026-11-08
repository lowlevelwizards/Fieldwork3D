/** R7.14: one opt-in Lighting Lab for every actual Arsenal 3D weapon.
 * UI state is ephemeral and never added to recipes, inventory or saves.
 */
import type {StudioLightLabSettings} from '../operator-studio-light-lab.ts';
import {DEFAULT_STUDIO_LIGHT_LAB,effectiveStudioLightLab}
 from '../operator-studio-light-lab.ts';

type NumericKey='celLow'|'rimAmount'|'rimWidth'|'rimCoverage'|
 'rimFabricOpacity'|'rimSkinOpacity'|'lightAzimuth';
const numerical:readonly {
 key:NumericKey;label:string;min:number;max:number;step:number;
 suffix:string;factor:number
}[]=[
 {key:'celLow',label:'CEL SHADOW CUTOFF',min:.35,max:.9,step:.01,suffix:'%',factor:100},
 {key:'rimAmount',label:'HARD SURFACE OPACITY',min:0,max:1,step:.01,suffix:'%',factor:100},
 {key:'rimWidth',label:'GLINT THICKNESS',min:.5,max:2.5,step:.05,suffix:'%',factor:100},
 {key:'rimCoverage',label:'SINGLE-EDGE COVERAGE',min:.1,max:.8,step:.05,suffix:'%',factor:100},
 {key:'rimFabricOpacity',label:'CLOTH CREAM OPACITY',min:0,max:.5,step:.01,suffix:'%',factor:100},
 {key:'rimSkinOpacity',label:'SKIN WARMTH OPACITY',min:0,max:.6,step:.01,suffix:'%',factor:100},
 {key:'lightAzimuth',label:'KEY LIGHT ORBIT',min:-180,max:180,step:5,suffix:'°',factor:1}
];
export function mountArsenalLightingLab(host:HTMLElement,
 onChange:(settings:StudioLightLabSettings,compareOriginal:boolean)=>void,
 startOpen=false):void{
 let settings:StudioLightLabSettings={
  ...DEFAULT_STUDIO_LIGHT_LAB,toon:2,rim:'dual',gradient:'piece'
 };
 let compareOriginal=!startOpen;
 const details=document.createElement('details');
 details.className='arsenal-lighting-lab';
 details.open=startOpen;
 const heading=document.createElement('summary');
 heading.textContent='LIGHTING LAB · LIVE 3D';
 const body=document.createElement('div');body.className='arsenal-lighting-controls';
 const dropdown=(label:string,choices:readonly [string,string][],
  value:string,onValue:(value:string)=>void)=>{
  const wrap=document.createElement('label');wrap.textContent=label;
  const select=document.createElement('select');select.setAttribute('aria-label',label);
  for(const [id,name] of choices){
   const option=document.createElement('option');
   option.value=id;option.textContent=name;select.append(option);
  }
  select.value=value;
  select.addEventListener('change',()=>{onValue(select.value);emit();});
  wrap.append(select);body.append(wrap);return select;
 };
 dropdown('CEL SHADING',[['0','Original'],['2','2-band graphic']],
  String(settings.toon),value=>{
   settings={...settings,toon:Number(value) as StudioLightLabSettings['toon']};
  });
 dropdown('HIGHLIGHT',[['off','Off'],['dual','Material glints']],
  settings.rim,value=>{
   settings={...settings,rim:value as StudioLightLabSettings['rim']};
  });
 dropdown('HEIGHT SHADING',[['current','Original'],['piece','Soft grayscale'],
  ['piece-rose','Dusty gray-rose']],settings.gradient,value=>{
   settings={...settings,gradient:value as StudioLightLabSettings['gradient']};
  });
 dropdown('SHADOW-SIDE FILL',[['neutral','Original'],['plum-plus','Plum']],
  settings.shadow,value=>{
   settings={...settings,shadow:value as StudioLightLabSettings['shadow']};
  });
 const outputMap=new Map<NumericKey,HTMLOutputElement>();
 const inputMap=new Map<NumericKey,HTMLInputElement>();
 for(const def of numerical){
  const label=document.createElement('label');
  label.className='arsenal-lighting-range';
  const heading=document.createElement('span');heading.textContent=def.label;
  const output=document.createElement('output');
  const slider=document.createElement('input');
  slider.type='range';slider.min=String(def.min);slider.max=String(def.max);
  slider.step=String(def.step);slider.value=String(settings[def.key]);
  slider.setAttribute('aria-label',def.label);
  label.append(heading,output,slider);body.append(label);
  outputMap.set(def.key,output);inputMap.set(def.key,slider);
  slider.addEventListener('input',()=>{
   settings={...settings,[def.key]:Number(slider.value)};
   refreshLabels();emit();
  });
 }
 dropdown('GLINT MASK',[['off','Natural materials'],['on','Show mask']],
  settings.rimDebugMask?'on':'off',value=>{
   settings={...settings,rimDebugMask:value==='on'};
  });
 const actions=document.createElement('div');actions.className='arsenal-lighting-actions';
 const compare=document.createElement('button');compare.type='button';
 const reset=document.createElement('button');reset.type='button';
 reset.textContent='RESET';
 compare.addEventListener('click',()=>{
  compareOriginal=!compareOriginal;emit();
 });
 reset.addEventListener('click',()=>{
  settings={...DEFAULT_STUDIO_LIGHT_LAB,toon:2,rim:'dual',gradient:'piece'};
  compareOriginal=false;
  // Reset the complete control panel so its visible values match the renderer.
  details.replaceWith(details);
  for(const [key,input] of inputMap)input.value=String(settings[key]);
  refreshLabels();emit();
 });
 actions.append(compare,reset);body.append(actions);
 const note=document.createElement('small');
 note.textContent='Preview only · use CHOOSE MODEL to inspect every weapon family. A/B never changes saved builds.';
 body.append(note);details.append(heading,body);host.prepend(details);
 function refreshLabels(){
  for(const def of numerical){
   const output=outputMap.get(def.key);
   if(output)output.textContent=Math.round(settings[def.key]*def.factor)+def.suffix;
  }
 }
 function emit(){
  if(!details.open)return;
  compare.textContent=compareOriginal?'RETURN TO EXPERIMENT':'COMPARE ORIGINAL';
  onChange(effectiveStudioLightLab(settings),compareOriginal);
 }
 details.addEventListener('toggle',()=>{
  if(details.open){compareOriginal=false;emit();}
 });
 refreshLabels();
 onChange(settings,compareOriginal);
}
