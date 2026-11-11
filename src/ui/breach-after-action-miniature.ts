/** Small graphic personnel silhouette, NOT a fabricated historical photo.
 * Proportions echo the short/blocky Fieldwork miniature; identity is a color
 * accent only. Exact historic wardrobe is available in the 3D inspector.
 */
import type {ReplayActorIdentity} from '../breach-replay-manifest.ts';
const ns='http://www.w3.org/2000/svg';
const el=(tag:string,attrs:Record<string,string>)=>{
 const node=document.createElementNS(ns,tag);
 for(const [key,value] of Object.entries(attrs))node.setAttribute(key,value);
 return node;
};
const colors=['#7f937d','#838a78','#788c96','#a08b6f','#857b85'];
export function createSquadMiniature(
 identity:ReplayActorIdentity|null,large=false
):SVGSVGElement{
 const svg=el('svg',{viewBox:'0 0 140 185',role:'img',
  'aria-label':'Schematic Fieldwork operator miniature'});
 svg.classList.add('fw-v3-miniature');
 if(large)svg.classList.add('fw-v3-miniature-large');
 const tint=colors[(identity?.appearanceSeed??0)%colors.length]??colors[0];
 const body='#45534b',trim='#222e29',edge='#a0a79a';
 const box=(x:number,y:number,w:number,h:number,fill:string,r=2)=>{
   const shape=el('rect',{x:String(x),y:String(y),width:String(w),
     height:String(h),rx:String(r),fill,stroke:trim,'stroke-width':'2'});
   svg.append(shape);
 };
 // Headgear is intentionally schematic, never presented as a wardrobe photo.
 box(51,16,38,37,'#bca592',7);
 const hw=identity?.wardrobe?.headwear??'ach';
 if(hw!=='bare'){
   if(hw==='boonie')box(45,13,50,14,tint,5);
   else if(hw==='patrol-cap'||hw==='beret'||hw==='beanie'){
     box(48,11,44,15,tint,6);
   }else{box(47,9,46,22,tint,9);box(47,26,46,6,edge,2);}
 }
 box(36,56,68,64,tint,7);
 box(18,59,22,59,tint,6);box(100,59,22,59,tint,6);
 box(39,68,62,40,body,4);box(43,74,54,24,edge,3);
 box(44,117,52,17,body,3);
 box(42,133,25,43,tint,4);box(73,133,25,43,tint,4);
 box(38,171,30,9,trim,2);box(72,171,30,9,trim,2);
 return svg;
}
