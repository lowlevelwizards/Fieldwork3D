/** WC1: independent immutable covering state, aperture-local presentation only. */
import type {WindowOpening} from './breach-site.ts';
import {windowVisualHeadHeight} from './breach-opening-proportions.ts';
export const COVERING_FAMILIES=['curtain','vertical-blind','horizontal-blind','roller-shade','hinged-shutter','rolling-shutter'] as const;
export type CoveringFamily=typeof COVERING_FAMILIES[number];
export const COVERING_POSITIONS=[0,.25,.5,1] as const;
export type CoveringPosition=typeof COVERING_POSITIONS[number];
export type CoveringPalette='linen'|'sand'|'sage'|'slate';
export type WindowCovering=Readonly<{family:CoveringFamily;side:-1|1;opening:CoveringPosition;
 palette:CoveringPalette;tilted?:boolean;integrity?:number;locked?:boolean}>;
export function normalizeWindowCovering(w:Pick<WindowOpening,'covering'|'treatment'>):WindowCovering|undefined{
 const c:WindowCovering|undefined=w.covering??(w.treatment==='open-curtains'?
  {family:'curtain',side:1,opening:1,palette:'sand'}:undefined);
 if(!c||!COVERING_FAMILIES.includes(c.family))return undefined;
 const opening=Number.isFinite(c.opening)?c.opening:1;
 return Object.freeze({family:c.family,side:c.side===-1?-1:1,
  opening:COVERING_POSITIONS.reduce((a,b)=>Math.abs(b-opening)<Math.abs(a-opening)?b:a),
  palette:(['linen','sand','sage','slate'] as const).includes(c.palette)?c.palette:'linen',
  integrity:Number.isFinite(c.integrity)?Math.max(0,Math.min(1,c.integrity!)):1,
  ...(c.family.includes('blind')?{tilted:!!c.tilted}:{}),
  ...(c.family.includes('shutter')?{locked:!!c.locked}:{})});
}
export type CoveringPiece={x:number;y:number;z:number;w:number;h:number;d:number;
 role:'body'|'fold'|'hardware';yaw?:number};
/** X follows aperture; Y is height; signed Z selects face. Not a collision mesh. */
export function windowCoveringPieces(w:WindowOpening,c:WindowCovering,opening:number=c.opening,tilt:number=Number(!!c.tilted)):CoveringPiece[]{
 const width=Math.max(1,w.width-4),bottom=w.sillHeight??14,top=w.headHeight??windowVisualHeadHeight(w.style);
 const h=top-bottom,y=bottom+h/2,z=c.side*8,shut=1-Math.max(0,Math.min(1,opening)),p:CoveringPiece[]=[];
 if(!Number.isFinite(width)||!Number.isFinite(h)||h<=0||c.integrity===0)return p;
 const add=(x:number,yy:number,zz:number,ww:number,hh:number,dd:number,role:CoveringPiece['role']='body',yaw?:number)=>{
  if(ww>0&&hh>0&&dd>0)p.push({x,y:yy,z:zz,w:ww,h:hh,d:dd,role,...(yaw===undefined?{}:{yaw})});
 };
 const rail=(x:number,yy:number,ww:number,hh:number,dd:number)=>add(x,yy,z,ww,hh,dd,'hardware');
 switch(c.family){
 case 'curtain':{
  rail(0,top+1,width+6,1.8,2.2);
  const panel=Math.min(width/2,Math.max(4,width/2*shut));
  for(const side of [-1,1]){
   const x=side*(width/2-panel/2);
   add(x,y,z,panel,h,2.2);
   for(let i=0;i<3;i++)add(x-panel/2+panel*(i+.5)/3,y,z+c.side*1.3,panel*.17,h,1.4,'fold');
  }break;
 }
 case 'vertical-blind':{
  rail(0,top+1,width+1,2.8,3.8);
  const span=Math.max(width*.12,width*shut),pitch=span/8,slat=width/8;
  for(let i=0;i<8;i++)add(-width/2+pitch*(i+.5),y,z,slat*.94,h-1,1.1,i%2?'fold':'body',
   Math.max(tilt*Math.PI*.42,Math.acos(Math.min(1,pitch/slat)))); // compressed stack turns edge-on
  break;
 }
 case 'horizontal-blind':{
  rail(0,top+1,width+1,2.7,3.8);
  const span=Math.max(h*.1,h*shut),pitch=span/7;
  for(let i=0;i<7;i++)add(0,top-pitch*(i+.5),z,width,pitch*(.88-.53*tilt),1.5+1.5*tilt,i%2?'fold':'body');
  rail(0,top-span,width,1.1,3);break;
 }
 case 'roller-shade':{
  rail(0,top+1,width+2,3,4);
  const span=h*shut;if(span>0){add(0,top-span/2,z,width,span,1.4);rail(0,top-span,width,1.6,2.5);}break;
 }
 case 'hinged-shutter':{
  const leaf=width/2,angle=opening*Math.PI*.92;
  for(const side of [-1,1]){
   const hinge=side*width/2,dir=-side,yaw=-dir*c.side*angle;
   const x=hinge+dir*leaf/2*Math.cos(angle),zz=z+c.side*leaf/2*Math.sin(angle);
   add(x,y,zz,leaf-.25,h,2.4,'body',yaw);
   for(const yy of [bottom+2,top-2])add(x+Math.sin(yaw)*c.side*1.6,yy,zz+Math.cos(yaw)*c.side*1.6,leaf-.5,2,1.3,'fold',yaw);
   for(const yy of [bottom+3,top-3])rail(hinge,yy,2,2.8,3);
  }break;
 }
 case 'rolling-shutter':{
  rail(0,top+2,width+5,4.5,5);
  for(const side of [-1,1])rail(side*(width/2+1),y,2,h,3);
  const span=h*shut;
  if(span>0){add(0,top-span/2,z,width,span,2.5);
   for(let i=1;i<7;i++)add(0,top-span*i/7,z+c.side*1.5,width,.65,.7,'fold');
   rail(0,top-span,width,1.5,3.5);}
  break;
 }
 }return p;
}
const labels:Record<CoveringFamily,string>={curtain:'Fabric curtains','vertical-blind':'Vertical slat blinds','horizontal-blind':'Horizontal blinds','roller-shade':'Roller shade','hinged-shutter':'Hinged shutters','rolling-shutter':'Rolling security shutter'};
export function windowCoveringSpecimens(){
 return COVERING_FAMILIES.flatMap(family=>[false,true].flatMap(vertical=>([1,.5,0] as const).map(opening=>({
  id:'window-covering:'+family+':'+opening+':'+(vertical?'vertical':'horizontal'),
  label:labels[family]+' / '+(opening===1?'Open':opening===0?'Closed':'Partial')+' / '+(vertical?'Y wall':'X wall'),
  vertical,covering:{family,opening,side:vertical?-1:1,palette:family.includes('shutter')?'slate':'linen'} as WindowCovering
 }))));
}
