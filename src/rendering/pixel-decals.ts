/** MA5: authored graphic silhouettes with bounded deterministic variants.
 * White straight-alpha coverage is consumed by the existing material-specific
 * tint/opacity and atlas systems. No new live draw or texture per mark. */
import {PIXEL_WORLD_SIZE} from './pixel-recipes.ts';
export type WearTextureKind='dust'|'stain'|'scrape'|'scuff'|'oil'|'grease'|'rust'|'chip'|'crack'|'scratch'|'drip'|'mud'|'footprint'|'mineral'|'fade'|'soot'|'moss'|'paint-peel'|'fray'|'abrade';
export const WEAR_TEXTURE_KINDS=['dust','stain','scrape','scuff','oil','grease','rust','chip','crack','scratch','drip','mud','footprint','mineral','fade','soot','moss','paint-peel','fray','abrade'] as const satisfies readonly WearTextureKind[];
export const WEAR_VARIANTS=4;
export function wearVariant(id:string){let n=2166136261;for(let i=0;i<id.length;i++)n=Math.imul(n^id.charCodeAt(i),16777619);return (n>>>0)%WEAR_VARIANTS;}
type P=readonly [number,number];
const clamp=(n:number,a:number,b:number)=>Math.max(a,Math.min(b,n));
function distance(x:number,y:number,a:P,b:P){const dx=b[0]-a[0],dy=b[1]-a[1],t=clamp(((x-a[0])*dx+(y-a[1])*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(x-a[0]-dx*t,y-a[1]-dy*t);}
function path(x:number,y:number,p:readonly P[],r:number){for(let i=1;i<p.length;i++)if(distance(x,y,p[i-1],p[i])<r)return true;return false;}
const oval=(x:number,y:number,cx:number,cy:number,rx:number,ry:number)=>((x-cx)/rx)**2+((y-cy)/ry)**2;
const contours=[
 [-.10,.04,.13,.02,-.08,.12,-.05,.06],
 [.13,-.02,-.11,.08,.02,-.12,.09,-.04],
 [-.03,.15,.03,-.13,.06,-.04,.12,-.10],
 [.02,-.14,.09,.12,-.05,.02,-.12,.08]
] as const;
const cracks:readonly (readonly P[])[]=[
 [[-.22,-.89],[-.07,-.61],[-.18,-.30],[.12,-.09],[.04,.22],[.31,.49],[.18,.89]],
 [[.34,-.88],[.14,-.58],[.22,-.31],[-.13,-.04],[-.08,.29],[-.39,.55],[-.29,.90]],
 [[-.56,-.75],[-.31,-.51],[-.34,-.22],[.03,.02],[.32,.16],[.27,.51],[.53,.80]],
 [[.14,-.90],[-.12,-.61],[.01,-.40],[-.24,-.15],[-.10,.13],[-.36,.44],[-.17,.88]]
];
export function wearPixels(kind:WearTextureKind,seed=0,size=32):Uint8Array{
 const out=new Uint8Array(size*size*4),variant=((Math.trunc(seed)%WEAR_VARIANTS)+WEAR_VARIANTS)%WEAR_VARIANTS;
 const edge=contours[variant],flip=variant%2?-1:1,shift=(variant-1.5)*.09,px=2/size;
 const crack=cracks[variant],branch:P[]=[crack[3],[crack[3][0]+.23*flip,crack[3][1]-.22],[.74*flip,-.38+shift]];
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const u=((x+.5-size/2)/(size/2))*flip,v=(y+.5-size/2)/(size/2);
  const sector=Math.floor((Math.atan2(v,u)+Math.PI)/(Math.PI*2)*8)%8,jag=edge[sector];
  const core=oval(u,v,shift,0,.70,.60);
  const irregular=Math.min(core,oval(u,v,-.41,.20,.40,.33),oval(u,v,.34,-.30,.33,.34));
  let a=0;
  switch(kind){
   case 'dust':{
    const field=Math.min(oval(u,v,-.28,.14,.65,.48),oval(u,v,.40,-.27,.44,.39));
    if(field<1+jag)a=field<.51?120:65;
    if(oval(u,v,.61,.46,.16,.12)<1)a=85;break;
   }
   case 'stain':if(irregular<1+jag)a=irregular<.64?180:100;break;
   case 'oil':{
    const pool=Math.min(oval(u,v,-.12,.12,.61,.49),oval(u,v,.38,-.20,.32,.40));
    if(pool<1+jag)a=pool<.63?235:145;
    if(oval(u,v,-.71,-.37,.13,.10)<1)a=150;break;
   }
   case 'grease':{
    const smear=oval(u,v,.02,.07,.87,.46);
    if(smear<1+jag)a=Math.abs(v+.18*u)<.18?210:110;
    if(Math.abs(v-.31+.18*u)<Math.max(px*.54,.055)&&u>-.65&&u<.62)a=160;break;
   }
   case 'rust':if(irregular<1+jag)a=irregular<.55?230:145;else if(oval(u,v,.66,.51,.17,.13)<1)a=155;break;
   case 'chip':{
    const shape=Math.abs(u+.08)/.58+Math.abs(v-.04)/.66;
    if(shape<1+jag)a=shape<.72?235:165;
    if(oval(u,v,.65,-.37,.12,.16)<1)a=190;break;
   }
   case 'paint-peel':{
    const field=Math.min(oval(u,v,-.22,.10,.66,.72),oval(u,v,.37,-.27,.36,.44));
    if(field<1+jag)a=field<.70?230:150;
    if(Math.abs(v+.62+.18*u)<.10&&u>.26&&u<.72)a=170;break;
   }
   case 'scrape':{
    const t=clamp((u+.87)/1.74,0,1),w=.13*(.4+.6*Math.sin(Math.PI*t));
    if(Math.abs(v+.24*u+shift+jag*.25)<Math.max(px*.55,w)&&Math.abs(u)<.87)a=215;
    if(Math.abs(v-.22+.20*u)<px*.55&&u>-.46&&u<.71)a=115;break;
   }
   case 'scuff':
    if(path(u,v,[[-.86,.35],[-.48,.12],[.02,.00],[.76,-.28]],Math.max(px*.60,.07)))a=210;
    if(path(u,v,[[-.68,.55],[-.27,.39],[.18,.28]],Math.max(px*.55,.05)))a=140;
    if(path(u,v,[[.08,-.21],[.43,-.39],[.83,-.47]],Math.max(px*.55,.05)))a=155;break;
   case 'scratch':
    if(path(u,v,[[-.83,.49],[-.22,.19],[.20,-.08],[.79,-.44]],Math.max(px*.54,.033)))a=215;
    if(variant>=2&&path(u,v,[[-.51,.57],[-.04,.33],[.43,.06]],px*.48))a=115;break;
   case 'crack':
    if(path(u,v,crack,Math.max(px*.60,.044)))a=230;
    else if(path(u,v,branch,Math.max(px*.50,.027)))a=145;break;
   case 'drip':{
    const d=Math.abs(u-shift-.09*Math.sin(v*3));
    if(v>-.78&&v<.86&&d<Math.max(px*.55,.14*(1-(v+1)*.37)))a=v<-.38?210:160;
    if(oval(u,v,shift,-.72,.24,.15)<1)a=220;break;
   }
   case 'mud':{
    const splash=Math.min(oval(u,v,-.15,.14,.64,.56),oval(u,v,.44,-.17,.31,.32));
    if(splash<1+jag)a=splash<.66?215:135;
    if(oval(u,v,-.67,-.48,.17,.11)<1||oval(u,v,.65,.53,.12,.16)<1)a=165;break;
   }
   case 'footprint':{
    const center=u-.10*v,fore=oval(center,v,0,-.36,.39,.46),heel=oval(center,v,-.02,.53,.27,.29);
    const arch=Math.abs(center+.05)<.18&&v>-.13&&v<.39;
    if(fore<1||heel<1||arch){
     const groove=Math.abs(v+.28)<.045||Math.abs(v+.06)<.035||Math.abs(v-.51)<.04;
     a=groove?100:210;
    }break;
   }
   case 'mineral':{
    const d=oval(u,v,.02,.05,.72,.48);
    if(d<1+jag&&d>.50+jag*.4)a=190;
    else if(d<.48)a=72;
    if(oval(u,v,-.58,.50,.12,.08)<1)a=130;break;
   }
   case 'fade':if(irregular<1+jag)a=irregular<.52?110:55;break;
   case 'soot':{
    const plume=Math.min(oval(u,v,shift,-.10,.55,.76),oval(u,v,-.31,.39,.43,.40));
    if(plume<1+jag)a=plume<.52?180:75;break;
   }
   case 'moss':{
    const base=Math.min(oval(u,v,-.40,.38,.43,.41),oval(u,v,.10,.28,.43,.56),oval(u,v,.56,.47,.30,.32));
    if(base<1+jag)a=base<.54?215:150;break;
   }
   case 'fray':{
    const d=Math.abs(u),length=(.12+jag*.28);
    if(d>.65&&d<.83+length&&Math.abs(v)<.85&&Math.floor((v+1)*8+variant)%3!==1)a=d<.77?205:125;
    if(d>.56&&d<.69&&Math.abs(v)<.68)a=125;break;
   }
   case 'abrade':{
    const d=oval(u,v,shift,.0,.82,.64);
    if(d<1+jag){a=75;if(Math.abs(v+.15*u+.18)<Math.max(px*.54,.10)||Math.abs(v-.26+.08*u)<Math.max(px*.54,.08))a=180;}break;
   }
  }
  const i=(y*size+x)*4;out[i]=out[i+1]=out[i+2]=255;out[i+3]=a;
 }
 return out;
}
export const wearTexelsForWorld=(worldSize:number)=>Math.max(1,Math.round(worldSize/PIXEL_WORLD_SIZE));
