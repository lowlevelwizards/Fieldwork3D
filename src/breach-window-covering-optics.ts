/** WC3: revision-cached optical aperture strips, independent of collision. */
import type {Pt,Segment} from './breach-core.ts';
import type {WindowOpening} from './breach-site.ts';
import type {Session} from './breach-game.ts';
import {normalizeWindowCovering,type WindowCovering} from './breach-window-coverings.ts';
import {windowVisualHeadHeight} from './breach-opening-proportions.ts';
export type CoveringOpticalStrip={edge:Segment;bottom:number;top:number;vertical:boolean;plane:number;lo:number;hi:number};
/** Broad opaque portions, never individual slat rays. Tilted blinds transmit
 * sight in the tactical approximation. Legacy open curtains stay clear. */
export function windowCoveringOpticalStrips(w:WindowOpening,c:WindowCovering|undefined=normalizeWindowCovering(w)):CoveringOpticalStrip[]{
 if(!c||c.integrity===0||c.opening===1||c.tilted&&c.family.includes('blind'))return [];
 const bottom=w.sillHeight??14,top=w.headHeight??windowVisualHeadHeight(w.style),half=w.width/2;
 if(!Number.isFinite(half)||half<=0||!Number.isFinite(top)||top<=bottom)return [];
 const center=w.vertical?w.y:w.x,plane=w.vertical?w.x:w.y;
 const out:CoveringOpticalStrip[]=[];
 const add=(l:number,r:number,b:number,t:number)=>{
  if(r-l<.01||t-b<.01)return;
  const lo=center+l,hi=center+r;
  const edge:Segment=w.vertical?{a:{x:plane,y:lo},b:{x:plane,y:hi}}:{a:{x:lo,y:plane},b:{x:hi,y:plane}};
  out.push({edge,bottom:b,top:t,vertical:w.vertical,plane,lo,hi});
 };
 const shut=1-c.opening;
 switch(c.family){
 case 'curtain':{const panel=half*shut;add(-half,-half+panel,bottom,top);add(half-panel,half,bottom,top);break;}
 case 'vertical-blind':add(-half,-half+w.width*shut,bottom,top);break;
 case 'horizontal-blind':case 'roller-shade':case 'rolling-shutter':add(-half,half,top-(top-bottom)*shut,top);break;
 case 'hinged-shutter':{const panel=half*Math.max(0,Math.cos(c.opening*Math.PI*.92));add(-half,-half+panel,bottom,top);add(half-panel,half,bottom,top);break;}
 }
 return out;
}
export function coveringStripsBlockRay(strips:readonly CoveringOpticalStrip[],a:Pt,b:Pt,fromHeight:number,toHeight=fromHeight):boolean{
 for(const s of strips){
  const start=s.vertical?a.x:a.y,end=s.vertical?b.x:b.y;
  if((start<s.plane&&end<=s.plane)||(start>s.plane&&end>=s.plane)||Math.abs(end-start)<1e-8)continue;
  const t=(s.plane-start)/(end-start);
  // Sight of the surface itself is allowed, only crossings block.
  if(t<=1e-6||t>=1-1e-6)continue;
  const along=s.vertical?a.y+(b.y-a.y)*t:a.x+(b.x-a.x)*t;
  if(along<s.lo||along>s.hi)continue;
  const height=fromHeight+(toHeight-fromHeight)*t;
  if(height>=s.bottom&&height<=s.top)return true;
 }return false;
}
type PhysicalStrip=CoveringOpticalStrip & {windowIndex:number;family:WindowCovering['family']};
type Optics={physical:PhysicalStrip[];windows:Session['windows'];site:Session['site'];revision:number;strips:CoveringOpticalStrip[];standing:Segment[];low:Segment[];all:Segment[]};
const cache=new WeakMap<Session,Optics>(),empty:Session['windows']=[];
export function sessionCoveringOptics(s:Session):Optics{
 const windows=s.windows??empty,revision=s.objectRevision;
 const old=cache.get(s);
 if(old&&old.windows===windows&&old.site===s.site&&old.revision===revision)return old;
 const physical:PhysicalStrip[]=[];
 const strips=windows.flatMap((w,index)=>{
  const c=normalizeWindowCovering(w),strips=windowCoveringOpticalStrips(w,c);
  if(c)for(const strip of strips){
   const shift=(w.vertical?-c.side:c.side)*8,plane=strip.plane+shift;
   const edge:Segment=w.vertical?{a:{x:plane,y:strip.lo},b:{x:plane,y:strip.hi}}:{a:{x:strip.lo,y:plane},b:{x:strip.hi,y:plane}};
   physical.push({...strip,plane,edge,windowIndex:index,family:c.family});
  }
  return strips;
 });
 const at=(height:number)=>strips.filter(p=>height>=p.bottom&&height<=p.top).map(p=>p.edge);
 const next={physical,windows,site:s.site,revision,strips,standing:at(32),low:at(22),all:strips.map(p=>p.edge)};
 cache.set(s,next);return next;
}
export function windowCoveringsBlockSight(s:Session,a:Pt,b:Pt,fromHeight:number,toHeight=fromHeight):boolean{
 return coveringStripsBlockRay(sessionCoveringOptics(s).strips,a,b,fromHeight,toHeight);
}
export function windowCoveringSightSegments(s:Session,low=false):readonly Segment[]{
 const o=sessionCoveringOptics(s);return low?o.low:o.standing;
}
/** Conservative receiver-light projection: any opaque part can stop a
 * height-spanning flash or point-light sphere. Shared cached geometry. */
export function windowCoveringTransientSegments(s:Session):readonly Segment[]{return sessionCoveringOptics(s).all;}
/** Immutable atomic state replacement; visual sampling remains independent. */
export function setSessionWindowCovering(s:Session,id:string,covering:WindowCovering):boolean{
 const w=s.windows.find(w=>w.id===id);if(!w)return false;
 const next=normalizeWindowCovering({covering});
 if(!next||JSON.stringify(next)===JSON.stringify(w.covering))return false;
 w.covering=next;s.objectRevision++;s.illuminationRevision=(s.illuminationRevision??0)+1;return true;
}

export function windowCoveringPhysicalStrips(s:Session):readonly PhysicalStrip[]{return sessionCoveringOptics(s).physical;}
