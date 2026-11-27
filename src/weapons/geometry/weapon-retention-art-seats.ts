/** Artist-authored strap seats for Fieldwork's exaggerated 3D models.
 * All numbers below are fictional model-local art coordinates, NOT real
 * weapon dimensions or installation instructions. Geometry is unchanged.
 * Color-only variants deliberately share their contour's marker.
 * See weapon-retention-visual-sockets for surface projection. */
import type {WeaponFamilyBuild} from '../../equipment-weapon-families.ts';
import {r870Tube} from './r870-front-p14.ts';
export type ArtSeatSlot='receiver'|'stock'|'handguard'|'barrel'|'magazine';
export type ArtSeat=Readonly<{slot:ArtSeatSlot;x:number;y:number}>;
const s=(slot:ArtSeatSlot,x:number,y:number):ArtSeat=>({slot,x,y});
const r=(x:number,y:number)=>s('receiver',x,y);
const b=(x:number,y:number)=>s('stock',x,y);
const h=(x:number,y:number)=>s('handguard',x,y);
const f=(x:number,y:number)=>s('barrel',x,y);
/** Rear receiver marker independent of buttstock silhouette. */
export const RECEIVER_ART_SEATS:Readonly<Record<string,ArtSeat>>={
 'ar-a1':r(-5.8,.15),'ar-a2':r(-5.8,.22),'ar-retro':r(-5.85,.48),'ar-flat':r(-5.8,.56),
 akm:r(-5.65,.18),ak74:r(-5.64,.26),ak74m:r(-5.85,.40),ak103:r(-5.85,.40),
 ak105:r(-5.85,.40),'ak-rpk74':r(-5.75,.22),akcompact:r(-5.05,.33),
 'hk-g3-early':r(-5.95,.20),'hk-g3-drum':r(-5.95,.40),
 'hk33-556-rifle':r(-5.72,.39),'hk53-556-compact':r(-5.72,.39),
 'hk-mp5-standard':r(-5.72,.26),'hk-mp5sd-integral':r(-5.72,.26),
 'hk-mp5k-stockless':r(-5.80,.56),'fal-50-receiver':r(-5.9,-.20),
 'fnc-service-receiver':r(-5.88,-.15),
 'g36-dual-receiver':r(-5.70,.22),'g36-rail-receiver':r(-5.70,.22),
 'g36-single-receiver':r(-5.70,.22),'r870-police-receiver':r(-5.80,-.45)
};
/** Rear markers deliberately distinguish solid, hollow, retractable,
 * hinged and stockless art. Null means use the receiver marker instead. */
export const STOCK_ART_SEATS:Readonly<Record<string,ArtSeat|null>>={
 'ar-fixed':b(-12.98,-3.22),'ar-fixed-a2':b(-13.48,-3.42),
 'ar-car':b(-13.45,-1.24),'ar-stock-m4':b(-12.90,-2.85),
 'ar-compact':b(-12.68,-1.89),
 'ak-wood':b(-13.75,-1.90),'ak-wood-amber':b(-13.75,-1.90),'ak-wood-red':b(-13.75,-1.90),
 'ak-wood74':b(-10.70,-1.00),'ak-wood74-amber':b(-10.70,-1.00),
 'ak-wood74-red':b(-10.70,-1.00),'ak-wood74-plum':b(-10.70,-1.00),
 'ak-poly':b(-13.40,-1.70),'ak-sidefold':b(-6.29,-.20),'ak-sidefold-plum':b(-6.29,-.20),
 'ak-skeleton':b(-6.05,.59),'ak-triangle-full':b(-5.90,-.15),
 'ak-triangle-padded':b(-5.90,.58),'ak-underfolder':b(-6.30,-1.00),
 'ak-rpk-clubfoot':b(-14.35,-2.20),'ak-rpk-clubfoot-amber':b(-14.35,-2.20),
 'ak-rpk-clubfoot-red':b(-14.35,-2.20),
 'hk-g3-wood-stock':b(-13.90,-1.65),'hk-g3-poly-stock':b(-13.65,-1.55),
 'hk-g3-retract-stock':b(-14.90,-.65),
 'hk33-fixed-stock':b(-12.90,-1.55),'hk33-fixed-stock-black':b(-12.90,-1.55),
 'hk33-retract-stock':b(-14.65,-.65),'hk53-retract-stock':b(-14.65,-.65),
 'hk-mp5-fixed-stock':b(-12.15,-1.48),'hk-mp5-retract-stock':b(-12.80,-.68),
 'hk-mp5k-cap':b(-6.30,.55),'hk-mp5k-pdw-stock':b(-6.33,-.24),
 'fal-fixed-polymer':b(-13.85,-3.55),'fal-fixed-wood':b(-13.85,-3.55),
 'fal-para-folder':b(-6.38,-.56),'fnc-tube-folder':b(-6.45,-.25),
 'g36-stock':b(-13.95,-3.72),'g36-stock-short':b(-12.97,-3.72),
 'g36-stock-adjustable':b(-13.72,-2.62),
 'r870-police-wood-stock':b(-14.65,-3.10),'r870-police-poly-stock':b(-14.65,-3.10),
 'r870-short-wood-stock':b(-12.66,-3.05),'r870-magpul-sga-stock':b(-13.60,-1.65),
 'r870-mcs-skeletal-stock':b(-13.90,-1.18),'r870-pistol-only':null,'r870-birdshead-only':null
};
/** Fore-end markers are intentionally authored by installed artwork,
 * rather than the same 82% bounding box position for every silhouette. */
export const FOREND_ART_SEATS:Readonly<Record<string,ArtSeat>>={
 'ar-triangle':h(13.70,-.38),'ar-round':h(13.70,-.45),'ar-carbine':h(11.80,-.30),
 'ar-car15-ribbed':h(11.38,-.30),'ar-733-ribbed':h(10.66,-.28),
 'ar-quad':h(11.63,.58),'ar-m5-rail':h(13.58,.58),'ar-pri-tube':h(15.32,.52),
 'ar-risii':h(12.78,.63),'ar-compact-rail':h(14.43,.60),
 'ak-wood-long':h(11.77,.42),'ak-wood-long-amber':h(11.77,.42),'ak-wood-long-red':h(11.77,.42),
 'ak-poly-long':h(11.77,.38),'ak-poly-plum-long':h(11.77,.38),'ak-rail-long':h(11.65,.50),
 'ak-rpk-wood':h(12.65,.45),'ak-rpk-wood-amber':h(12.65,.45),'ak-rpk-wood-red':h(12.65,.45),
 'ak-wood-short':h(10.35,.43),'ak-wood-short-amber':h(10.35,.43),'ak-wood-short-red':h(10.35,.43),
 'ak-poly-short':h(10.35,.43),'ak-poly-plum-short':h(10.35,.43),
 'ak-poly-mid':h(11.15,.43),'ak-poly-plum-mid':h(11.15,.43),
 'hk-g3-wood-vented':h(13.57,.18),'hk-g3-poly-slim':h(13.60,.28),
 'hk33-poly-slim':h(12.55,.26),'hk33-poly-slim-black':h(12.55,.26),
 'hk53-poly-short':h(8.87,.29),'hk53-poly-short-black':h(8.87,.29),
 'hk-mp5-tropical':h(9.08,.22),'hk-mp5-slim':h(9.09,.24),'hk-mp5-trirail':h(8.94,.15),
 'hk-mp5sd-shroud':h(9.40,.56),'hk-mp5k-vertical':h(4.14,.38),
 'fal-vented':h(13.69,.44),'fal-vented-wood':h(13.69,.44),
 'fnc-service-forearm':h(11.29,-.31),
 'g36-handguard-long':h(12.65,.88),'g36-handguard-k':h(10.30,.83),
 'g36-handguard-c':h(9.67,.80),'g36-handguard-k-rail':h(10.40,.72),
 // 870 markers are overridden by the fixed tube cap art below.
 'r870-police-wood-pump':h(11.10,-1.15),'r870-police-black-pump':h(11.10,-1.15),
 'r870-magpul-mlok-pump':h(10.80,-1.10),'r870-short-black-pump':h(9.40,-1.12),
 'r870-mcs-mini-pump':h(6.86,-1.12)
};
/** Dedicated front landmarks on the existing steel artwork, where that
 * model has a stronger fixed silhouette than the furniture. */
const FRONT_STEEL:Readonly<Record<string,ArtSeat>>={
 'ar-20':f(14.75,.54),'ar-20-service':f(14.75,.56),
 'ar-145':f(12.56,.52),'ar-145-gov':f(12.84,.56),'ar-733-115':f(11.83,.52),
 'ak-long':f(12.25,.15),'ak-103-factory':f(12.25,.15),'ak-rpk-long':f(13.14,.15),
 'ak-mid':f(11.75,.20),'ak-short':f(10.92,.20),
 'hk-g3-service':f(17.4,.85),'hk33-service':f(16.25,.72),'hk53-short':f(10.65,.72),
 'hk-mp5-standard-barrel':f(10.65,.74),'hk-mp5sd-integrated':f(9.95,.74),
 'hk-mp5k-short':f(5.25,.73),'fal-21-service':f(14.70,.78),
 'fal-172-para':f(14.70,.78),'fnc-177-service':f(14.26,.65)
};
export function authoredRetentionArtSeats(build:WeaponFamilyBuild,stockState?:string){
 const {parts,family}=build;
 const single=RECEIVER_ART_SEATS[parts.receiver];
 const stock=STOCK_ART_SEATS[parts.stock];
 const guard=FOREND_ART_SEATS[parts.handguard];
 if(!single||stock===undefined||!guard)return null;
 // Folded stock markers return to the hinge/receiver region. Collapsible
 // stock markers follow the same translated model artwork.
 const rear=stockState==='folded'||stock===null?single:
  stockState==='collapsed'?{...stock,x:stock.x+4.8}:stock;
 let front=guard;
 const modernAR=['ar-quad','ar-m5-rail','ar-pri-tube','ar-risii','ar-compact-rail'].includes(parts.handguard);
 if(!modernAR&&family!=='g36'&&family!=='r870')
  front=FRONT_STEEL[parts.barrel]??guard;
 if(family==='r870'){
  const tube=r870Tube(parts.magazine);
  if(tube)front=s('magazine',tube.capEnd-.24,-1.04);
 }
 return {rear,single,front,fallbackFront:guard};
}
