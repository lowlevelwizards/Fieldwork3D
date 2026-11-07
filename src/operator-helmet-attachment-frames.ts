/** H1 — authored attachment frames in canonical -Z forward head coordinates. */
import {HEAD_SILHOUETTE_METRICS} from './operator-headwear-silhouettes.ts';
import {isH1ModernHelmet,type H1ModernHelmet} from './operator-helmet-setup-policy.ts';
export const HELMET_SOCKET_NAMES=['frontShroud','frontLower','railLeft','railRight',
 'earLeft','earRight','rearCenter','rearUpper','lightLeft','lightRight',
 'chinLeft','chinRight','nape','coverFront','coverRear'] as const;
export type HelmetSocketName=typeof HELMET_SOCKET_NAMES[number];
export type HelmetSocket={position:readonly [number,number,number];normal:readonly [number,number,number]};
type Profile={front:number;rear:number;side:number;top:number;ear:number};
const metrics=(id:'ach'|'pasgt'|'high-cut',side:number):Profile=>{
 const m=HEAD_SILHOUETTE_METRICS[id];
 return {front:m.frontExtent,rear:m.rearExtent,side,top:m.top,ear:m.earEdge};
};
export const HELMET_MOUNT_PROFILES:Readonly<Record<H1ModernHelmet,Profile>>={
 ach:metrics('ach',5.08),pasgt:metrics('pasgt',5.18),
 'high-cut':metrics('high-cut',4.88),
 'mich-2002':{front:-5.70,rear:5.75,side:5.04,top:8.76,ear:4.05},
 'mich-2001':{front:-5.61,rear:5.64,side:4.97,top:8.70,ear:5.91},
 'fast-sf':{front:-5.53,rear:5.66,side:4.92,top:8.80,ear:6.04},
 'fast-xp-mid':{front:-5.68,rear:5.81,side:5.00,top:8.78,ear:4.20}
};
const s=(x:number,y:number,z:number,nx:number,ny:number,nz:number):HelmetSocket=>({
 position:[x,y,z],normal:[nx,ny,nz]
});
export function helmetMountSockets(id:string):Readonly<Record<HelmetSocketName,HelmetSocket>>|null{
 if(!isH1ModernHelmet(id))return null;
 const p=HELMET_MOUNT_PROFILES[id],crown=p.top-1.25,mid=p.ear+.70;
 return {
 frontShroud:s(0,crown,p.front-.24,0,0,-1),
 frontLower:s(0,crown-1,p.front-.20,0,0,-1),
 railLeft:s(-p.side-.14,mid,-.22,-1,0,0),
 railRight:s(p.side+.14,mid,-.22,1,0,0),
 earLeft:s(-4.62,3.6,.25,-1,0,0),
 earRight:s(4.62,3.6,.25,1,0,0),
 rearCenter:s(0,crown,p.rear+.15,0,0,1),
 rearUpper:s(0,p.top-.42,p.rear-.40,0,1,0),
 lightLeft:s(-p.side-.18,mid,p.front+1.55,-1,0,0),
 lightRight:s(p.side+.18,mid,p.front+1.55,1,0,0),
 chinLeft:s(-p.side+.15,p.ear+.26,1.3,-1,0,0),
 chinRight:s(p.side-.15,p.ear+.26,1.3,1,0,0),
 nape:s(0,3.45,p.rear+.1,0,0,1),
 coverFront:s(0,p.ear+1.1,p.front-.05,0,0,-1),
 coverRear:s(0,p.ear+1.1,p.rear+.05,0,0,1)
 };
}
