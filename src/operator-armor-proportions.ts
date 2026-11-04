/** R4 armor silhouette measurements.
 * Chest-local coordinates: +X forward, +Y up and +/-Z lateral.
 * The underlying operator's chest block is 10 (depth) x 12 (height)
 * x 14 (width); measurements are *stylized game units*, not centimeters.
 *
 * These are authored character-design targets, not universal physics,
 * armor statistics, or automatic real-world dimension conversion.
 * Visual seams and straps must remain readable at game camera distance.
 */
import {garmentContactAnchor} from './operator-garment-contact-surface.ts';

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
export type ArmorSideStyle='none'|'flat_slab'|'open_two_band'|
 'soft_wrap'|'side_plate';
export type ArmorCollarStyle='none'|'vest_v'|'high_flak'|
 'minimal_plate'|'standard_plate'|'heavy_plate'|'legacy_wrap';
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
 /** Orthogonal, box-like garment-side construction. */
 sideStyle:ArmorSideStyle;
 /** The collar carries each design's specific identity. */
 collarStyle:ArmorCollarStyle;
 /** Center of the body-side band in chest-local Y. */
 sideY:number;
 /** How far down the shaped bag the front strap is seated. */
 strapDrop:number;
 /** Visible padded strap thickness. */
 strapThickness:number;
 /** Rear armor width is authored independently of front. */
 rearWidth:number;
 /** External side plate height, only for heavy assault. */
 sidePlateHeight:number;
};
export const ARMOR_PROPORTIONS:Readonly<Record<string,ArmorProportion>>={
 'soft-slick':{family:'concealed',width:11.0,top:4.2,bottom:-4.8,
  shoulderWidth:0,sideHeight:0,upperInset:0,sideThickness:0,sideStyle:'none',collarStyle:'none',sideY:0,strapDrop:0,strapThickness:0,rearWidth:11,sidePlateHeight:0},
 'soft-paca':{family:'concealed',width:11.2,top:4.2,bottom:-4.8,
  shoulderWidth:0,sideHeight:0,upperInset:0,sideThickness:0,sideStyle:'none',collarStyle:'none',sideY:0,strapDrop:0,strapThickness:0,rearWidth:11.2,sidePlateHeight:0},
 'soft-vest':{family:'police',width:11.35,top:4.8,bottom:-5.2,
  shoulderWidth:2.85,sideHeight:8.8,upperInset:.95,sideThickness:.76,sideStyle:'soft_wrap',collarStyle:'vest_v',sideY:-0.48,strapDrop:0.66,strapThickness:0.62,rearWidth:11.35,sidePlateHeight:0},
 'soft-flak':{family:'fragmentation',width:12.4,top:5.5,bottom:-6.5,
  shoulderWidth:3.45,sideHeight:10.1,upperInset:1.60,sideThickness:.89,sideStyle:'soft_wrap',collarStyle:'high_flak',sideY:-0.72,strapDrop:0.72,strapThickness:0.94,rearWidth:12.4,sidePlateHeight:0},
 'plate-slick':{family:'slick',width:8.95,top:4.34,bottom:-4.12,
  shoulderWidth:1.50,sideHeight:.90,upperInset:1.20,sideThickness:.62,sideStyle:'flat_slab',collarStyle:'minimal_plate',sideY:-1.55,strapDrop:1.28,strapThickness:.50,rearWidth:8.95,sidePlateHeight:0},
 'plate-jpc':{family:'skeleton',width:9.35,top:4.88,bottom:-4.98,
  shoulderWidth:1.88,sideHeight:.62,upperInset:1.50,sideThickness:.62,sideStyle:'open_two_band',collarStyle:'minimal_plate',sideY:-1.1,strapDrop:1.40,strapThickness:.52,rearWidth:9.35,sidePlateHeight:0},
 'plate-standard':{family:'standard',width:10.50,top:5.16,bottom:-5.62,
  shoulderWidth:2.32,sideHeight:3.28,upperInset:1.12,sideThickness:.98,sideStyle:'flat_slab',collarStyle:'standard_plate',sideY:-1.14,strapDrop:1.22,strapThickness:.76,rearWidth:10.50,sidePlateHeight:0},
 'plate-heavy':{family:'assault',width:11.65,top:5.55,bottom:-6.42,
  shoulderWidth:3.18,sideHeight:4.78,upperInset:1.04,sideThickness:1.18,sideStyle:'side_plate',collarStyle:'heavy_plate',sideY:-1.48,strapDrop:1.30,strapThickness:.97,rearWidth:11.65,sidePlateHeight:5.10},
 'plate-legacy':{family:'legacy',width:12.15,top:5.45,bottom:-6.77,
  shoulderWidth:3.55,sideHeight:10.8,upperInset:1.40,sideThickness:1.15,sideStyle:'soft_wrap',collarStyle:'legacy_wrap',sideY:-0.65,strapDrop:0.65,strapThickness:0.96,rearWidth:12.25,sidePlateHeight:0}
};
export const ARMOR_VISIBLE_STYLES=[
 'soft-vest','soft-flak','plate-slick','plate-jpc',
 'plate-standard','plate-heavy','plate-legacy'
] as const;
/** Landmarks use the actual selected garment, and are cached with it.
 * The fit layer may lift a shoulder but never silently rescale its bag.
 */
export function armorGarmentLandmarks(top:string){
 const shoulder=garmentContactAnchor(top,5.3);
 return {
  shoulderY:shoulder.topY,
  sternum:garmentContactAnchor(top,ARMOR_ANATOMY.upperSternum),
  ribs:garmentContactAnchor(top,ARMOR_ANATOMY.lowerRibs),
  waist:garmentContactAnchor(top,ARMOR_ANATOMY.waist),
  shoulder
 };
}
