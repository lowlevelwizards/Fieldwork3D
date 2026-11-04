/** RIG-A: actual exterior surfaces for the first two chest rigs.
 * Unlike the old universal rigShiftX these anchors line up the INNER FACE
 * of the authored panel with whichever material is visibly underneath.
 * +X is front; all coordinates are chest-local style units.
 *
 * No protection, inventory, collisions or rig capacity change here.
 */
import {ARMOR_PROFILES} from './operator-armor-rig-silhouettes.ts';
import {ARMOR_PROPORTIONS} from './operator-armor-proportions.ts';
import {fittedArmorSurfaces,armorContactSurface}
 from './operator-uniform-fit-envelope.ts';
import {armorSideLayout} from './operator-armor-side-layout.ts';

export type RigMountMode='external-harness'|'carrier-placard';
export type RigContactFrame={
 armor:string;top:string;rig:string;mode:RigMountMode;
 front:{x:number;y:number};back:{x:number;y:number};
 sideRight:{z:number};shoulderRight:{z:number};
 shoulderY:number;rigShiftX:number;standOff:number;
 panelInnerX:number;sideContact:number;
};
/** Only equipment explicitly intended to receive a front placard has tabs.
 * A generic flak, tactical vest, slick carrier or legacy shell does NOT
 * magically turn into a MOLLE placard mounting platform.
 */
export const RIG_MODULAR_ARMORS=new Set([
 'plate-jpc','plate-standard','plate-heavy'
]);
export const RIG_PANEL_INNER_FACES:Readonly<Record<string,number>>={
 'chest-placard':8.14-.70*.5,
 'micro-rig':7.90-.76*.5,
 // Historic chest rigs: backing panel or foremost pouch rear surface.
 'light-rig':8.38-1.07*.5,
 'chicom-rig':7.95-.60*.5,
 'bandolier':8.20-.72*.5,
 'split-front':8.12-.75*.5,
 'full-chest':8.39-.78,
 'lbv':7.82-.72
};
export function rigContactFrame(armor:string,top:string,rig:string):RigContactFrame{
 const baseline=ARMOR_PROFILES[armor]??ARMOR_PROFILES['armor-bare'];
 const spec=ARMOR_PROPORTIONS[armor];
 const fit=fittedArmorSurfaces(armor,top,baseline);
 const y=rig==='micro-rig'?-2.65:
  rig==='light-rig'?-2.20:
  rig==='chicom-rig'?-2.35:
  rig==='bandolier'?-2.00:
  rig==='split-front'?-1.90:
  rig==='full-chest'?-1.72:
  rig==='lbv'?-1.55:-2.05;
 const cloth=armorContactSurface(top,y);
 const exposed=armor!=='armor-bare'&&armor!=='soft-slick'&&
  armor!=='soft-paca'&&!!spec&&
  y>spec.bottom+.4&&y<spec.top-.4;
 const outerFront=exposed?fit.front:cloth.front;
 const outerBack=exposed?fit.back:cloth.back;
 const side=exposed&&spec?armorSideLayout(fit,spec).centerZ+
  spec.sideThickness*.5+(armor==='plate-heavy'?.63:.08):
  cloth.side;
 const clearance=.14;
 const panelInnerX=RIG_PANEL_INNER_FACES[rig]??7.80;
 return {
  armor,top:fit.top,rig,
  mode:rig==='chest-placard'&&RIG_MODULAR_ARMORS.has(armor)?
   'carrier-placard':'external-harness',
  front:{x:outerFront,y},back:{x:outerBack,y},
  sideRight:{z:side+.14},
  shoulderRight:{z:fit.shoulderZ},
  shoulderY:fit.shoulderY+.12,
  rigShiftX:outerFront+clearance-panelInnerX,
  standOff:clearance,panelInnerX,sideContact:side
 };
}
