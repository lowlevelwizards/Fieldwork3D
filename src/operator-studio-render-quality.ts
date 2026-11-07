/** Studio-only rendering A/B quality settings. All toggles are query-scoped;
 * no effects on tactical gameplay, saved appearance, shared assets or replay.
 * Canvas MSAA must be chosen before WebGL context creation. */
export type StudioRenderQuality={
 canvasAA:boolean;pixelRatio:number;shadowFilter:'soft'|'pcf'|'hard';
 shadowSize:1024|2048;shadowBias:'stable'|'legacy';
 liveShadows:boolean;celAA:boolean;bakedLighting:boolean;
 thumbnailAA:boolean;
};
export function requestedStudioRenderQuality(search:string,
 devicePixelRatio=1):StudioRenderQuality{
 const p=new URLSearchParams(search);
 const numeric=Number(p.get('studioPixelRatio')??'1.5');
 const ratio=Number.isFinite(numeric)?numeric:1.5;
 const maxDevice=Math.max(1,devicePixelRatio);
 return {
  canvasAA:p.get('studioAA')!=='off',
  pixelRatio:Math.max(1,Math.min(maxDevice,2,Math.max(1,ratio))),
  shadowFilter:p.get('studioShadowFilter')==='hard'?'hard':
   p.get('studioShadowFilter')==='pcf'?'pcf':'soft',
  shadowSize:p.get('studioShadowSize')==='2048'?2048:1024,
  shadowBias:p.get('studioShadowBias')==='legacy'?'legacy':'stable',
  liveShadows:p.get('studioLiveShadows')!=='off',
  celAA:p.get('studioCelAA')!=='off',
  bakedLighting:p.get('studioBakedLighting')!=='off',
  thumbnailAA:p.get('studioThumbAA')!=='off'
 };
}
export function studioQualityLink(
 url:string,updates:Record<string,string|null>
):string{
 const next=new URL(url);
 for(const [key,value] of Object.entries(updates))
  if(value===null)next.searchParams.delete(key);
  else next.searchParams.set(key,value);
 return next.toString();
}
