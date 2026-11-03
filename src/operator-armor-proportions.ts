/** R4 armor silhouette measurements.
 * Chest-local coordinates: +X forward, +Y up and +/-Z lateral.
 * The underlying operator's chest block is 10 (depth) x 12 (height)
 * x 14 (width); measurements are *stylized game units*, not centimeters.
 *
 * These are authored character-design targets, not universal physics,
 * armor statistics, or automatic real-world dimension conversion.
 * Visual seams and straps must remain readable at game camera distance.
 */
import {uniformFitEnvelope} from './operator-uniform-fit-envelope.ts';

export const ARMOR_ANATOMY={
 neckBase:7.0,
 shoulderCrown:6.5,
 upperSternum:3.6,
 lowerRibs:-3.0,
 waist:-5.6,
 belt:-7.7,
 shoulderRootZ:5.0
} as const;
export type ArmorFamily='concealed'|'police'|'fragmentation'|
 'slick'|'skeleton'|'standard'|'assault'|'legacy';
export type ArmorProportion={
 family:ArmorFamily;
 /** Visible frontal width and upper/lower envelope of the armor's body. */
 width:number; top:number; bottom:number;
 /** Lateral shoulder material width, not an IK or collision dimension. */
 shoulderWidth:number;
 /** Continuous side-wrap height (skeleton uses two open bands). */
 sideHeight:number;
 /** Width reduction in the upper shaped bag. */
 upperInset:number;
 /** Wrap's visible thickness away from the fabric. */
 sideThickness:number;
};
export const ARMOR_PROPORTIONS:Readonly<Record<string,ArmorProportion>>={
 'soft-slick':{family:'concealed',width:11.0,top:4.2,bottom:-4.8,
  shoulderWidth:0,sideHeight:0,upperInset:0,sideThickness:0},
 'soft-paca':{family:'concealed',width:11.2,top:4.2,bottom:-4.8,
  shoulderWidth:0,sideHeight:0,upperInset:0,sideThickness:0},
 'soft-vest':{family:'police',width:11.35,top:4.8,bottom:-5.2,
  shoulderWidth:2.85,sideHeight:8.8,upperInset:.60,sideThickness:.76},
 'soft-flak':{family:'fragmentation',width:12.4,top:5.5,bottom:-6.5,
  shoulderWidth:3.0,sideHeight:10.1,upperInset:1.35,sideThickness:.89},
 'plate-slick':{family:'slick',width:8.95,top:4.45,bottom:-3.90,
  shoulderWidth:1.55,sideHeight:1.42,upperInset:1.05,sideThickness:.63},
 'plate-jpc':{family:'skeleton',width:9.5,top:4.72,bottom:-4.12,
  shoulderWidth:1.92,sideHeight:.75,upperInset:1.30,sideThickness:.62},
 'plate-standard':{family:'standard',width:10.1,top:4.86,bottom:-4.52,
  shoulderWidth:1.97,sideHeight:2.65,upperInset:1.05,sideThickness:.90},
 'plate-heavy':{family:'assault',width:10.85,top:5.08,bottom:-5.08,
  shoulderWidth:2.65,sideHeight:3.62,upperInset:.92,sideThickness:1.03},
 'plate-legacy':{family:'legacy',width:12.15,top:5.45,bottom:-6.77,
  shoulderWidth:3.10,sideHeight:10.8,upperInset:1.1,sideThickness:1.15}
};
export const ARMOR_VISIBLE_STYLES=[
 'soft-vest','soft-flak','plate-slick','plate-jpc',
 'plate-standard','plate-heavy','plate-legacy'
] as const;
/** Landmarks use the actual selected garment, and are cached with it.
 * The fit layer may lift a shoulder but never silently rescale its bag.
 */
export function armorGarmentLandmarks(top:string){
 const garment=uniformFitEnvelope(top);
 return {
  shoulderY:garment.shoulderCrown,
  sternum:garment.outer(ARMOR_ANATOMY.upperSternum),
  ribs:garment.outer(ARMOR_ANATOMY.lowerRibs),
  waist:garment.outer(ARMOR_ANATOMY.waist),
  shoulder:garment.outer(5.3)
 };
}
