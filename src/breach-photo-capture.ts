/** P1: one-shot photographic capture of the already-rendered tactical frame.
 * Never creates a new WebGL renderer, simulates a frame, or includes DOM HUD.
 * The caller invokes this in the same RAF task as the actual WebGL draw. */
export type PhotoFilter='original'|'muted'|'mono'|'warm'|'contrast';
export type PhotoRatio='screen'|'16:9'|'4:5'|'1:1';
export const PHOTO_FILTERS:readonly PhotoFilter[]=
 ['original','muted','mono','warm','contrast'];
export const PHOTO_RATIOS:readonly PhotoRatio[]=
 ['screen','16:9','4:5','1:1'];
export const photoFilterCss=(filter:PhotoFilter,strength=1):string=>{
 const n=Math.max(0,Math.min(1,strength));
 switch(filter){
  case 'muted':return `saturate(${1-.42*n}) contrast(${1+.08*n})`;
  case 'mono':return `grayscale(${n}) contrast(${1+.10*n})`;
  case 'warm':return `sepia(${.30*n}) saturate(${1-.1*n})`;
  case 'contrast':return `contrast(${1+.28*n}) saturate(${1-.1*n})`;
  default:return 'none';
 }
};
export type PhotoCaptureRequest={
 scene:HTMLCanvasElement|null;overlay:HTMLCanvasElement;
 filter:PhotoFilter;strength:number;ratio:PhotoRatio;
};
export type CapturedPhoto={blob:Blob;width:number;height:number};
export async function capturePhotoFrame(input:PhotoCaptureRequest):Promise<CapturedPhoto>{
 const source=input.scene??input.overlay;
 if(source.width<2||source.height<2)throw Error('PHOTO FRAME IS NOT READY');
 const original=source.width/source.height;
 const target=input.ratio==='screen'?original:
  input.ratio==='16:9'?16/9:input.ratio==='4:5'?4/5:1;
 let sw=source.width,sh=source.height;
 if(original>target)sw=Math.round(sh*target);
 else sh=Math.round(sw/target);
 const sx=Math.round((source.width-sw)/2),sy=Math.round((source.height-sh)/2);
 // Never allocate a multi-megapixel target on every RAF or upscale source.
 const scale=Math.min(1,Math.sqrt(3_500_000/(sw*sh)));
 const width=Math.max(1,Math.floor(sw*scale));
 const height=Math.max(1,Math.floor(sh*scale));
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{alpha:false});
 if(!ctx)throw Error('PHOTO CANVAS IS UNAVAILABLE');
 ctx.fillStyle='#182a2a';ctx.fillRect(0,0,width,height);
 ctx.filter=photoFilterCss(input.filter,input.strength);
 try{
  ctx.drawImage(source,sx,sy,sw,sh,0,0,width,height);
  // The tactical overlay is intentionally omitted for 3D photos: it carries
  // planning annotations and is not part of the photogenic world.
 }catch{throw Error('COULD NOT READ THE RENDERED FRAME');}
 const blob=await new Promise<Blob|null>(resolve=>canvas.toBlob(resolve,'image/jpeg',.92));
 canvas.width=0;canvas.height=0;
 if(!blob||blob.size<512)throw Error('IMAGE ENCODING FAILED');
 return {blob,width,height};
}
