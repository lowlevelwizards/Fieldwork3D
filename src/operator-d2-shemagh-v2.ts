/** D2-R5B: intentionally chunky shemagh with continuous rear winding.
 * Heavy shoulder drape, three large face crossover tiers, and genuinely
 * closed rear crown. Only prebuilt mutually exclusive wearing modes.
 */
import * as THREE from 'three';
import {clothExterior,type ClothCuboid} from './operator-d2-fitted-cloth.ts';
export type D2ShemaghMode='draped'|'face-wrap'|'head-wrap';
const add=(p:ClothCuboid[],name:string,x:number,y:number,z:number,w:number,h:number,d:number)=>{
 p.push({name,x,y,z,width:w,height:h,depth:d});
};
function collarAndBib(p:ClothCuboid[]){
 // One continuous substantial neck/shoulder scarf, not stacked tiny plates.
 add(p,'scarf-collar-front',0,-1.28,-4.02,8.53,2.66,.78);
 add(p,'scarf-collar-back',0,-1.31,3.85,8.51,2.72,.76);
 for(const side of [-1,1])
  add(p,'scarf-collar-side',side*4.15,-1.28,-.10,.78,2.77,8.05);
 add(p,'heavy-upper-fold',-.20,-.55,-4.30,8.48,.96,.62);
 add(p,'lower-shoulder-fold',.44,-2.29,-4.24,8.24,.90,.62);
 // Larger voxel steps: four bold masses instead of five fine bib strips.
 const bands=[
  [-2.30,-3.52,8.56],[-3.40,-4.66,6.90],
  [-4.54,-5.84,4.90],[-5.72,-7.04,2.48]
 ] as const;
 for(const [i,[upper,lower,width]] of bands.entries())
  add(p,'broad-triangular-chest-bib-'+i,0,(upper+lower)/2,
   -4.22-.06*i,width,upper-lower,.72);
 add(p,'right-shoulder-drape',4.03,-3.16,-3.95,1.85,2.67,1.18);
 add(p,'right-hanging-scarf-tail',3.73,-5.30,-4.24,1.46,3.03,.88);
 add(p,'right-tail-point',3.73,-7.06,-4.26,1.02,.93,.72);
 add(p,'left-tucked-shoulder',-3.89,-2.99,-3.92,1.28,1.54,.81);
}
function joinedFaceWrap(p:ClothCuboid[]){
 // Three thick diagonal wraps deliberately read as folds rather than the
 // smaller five-strip mask from R4. No front shell between brow and eyes.
 const rows=[
  [-.50,.79,8.52,-.10],[.66,2.02,7.99,-.13],
  [1.88,3.23,6.92,.31]
 ] as const;
 for(const [i,[low,high,width,x]] of rows.entries())
  add(p,'diagonal-face-wrap-'+i,x,(low+high)/2,
   -4.28-.09*i,width,high-low,.62);
 add(p,'raised-nose-overlap',.48,2.89,-4.50,4.32,.63,.48);
 for(const side of [-1,1])
  add(p,'wraparound-cheek-side',side*4.16,1.33,.02,
   .67,4.09,8.24);
 add(p,'wraparound-rear',0,1.33,4.08,8.52,4.00,.73);
 add(p,'left-tucked-face-fold',-3.83,2.32,-4.24,1.20,1.35,.56);
}
function crownWindings(p:ClothCuboid[]){
 // Coarse forehead layers and positive rear overlap: the previous crown
 // band's upper edge stopped below the top cap, exposing a thin skull slit.
 add(p,'draped-crown-top',0,7.23,0,8.88,.82,8.90);
 add(p,'first-crown-winding',-.24,6.55,-4.32,8.87,1.20,.66);
 add(p,'second-crown-winding',.29,5.61,-4.49,8.76,1.10,.62);
 add(p,'wrapped-brow-ridge',-.15,4.99,-4.63,8.54,.72,.55);
 for(const side of [-1,1]){
  add(p,'crown-side-turn',side*4.28,5.73,.07,.76,3.34,8.77);
  add(p,'crown-rear-band',side*2.10,5.93,4.28,4.59,3.03,.83);
 }
 // Rear panel joins cheek wraps, side turns, and crown bands without an
 // interrupted centerline. A broad panel is retained for genuine coverage.
 add(p,'continuous-rear-closure',0,3.91,4.22,8.64,3.18,.88);
 for(const side of [-1,1])
  add(p,'rear-side-closure',side*4.23,3.78,1.69,.75,2.46,6.16);
 add(p,'rear-wrap-knot',-3.51,4.73,4.51,1.69,1.58,1.23);
 add(p,'long-rear-head-wrap-tail',-3.57,1.75,4.48,1.55,5.35,.96);
 add(p,'short-rear-head-wrap-tail',-2.50,3.30,4.48,1.22,2.34,.79);
}
export function createD2ShemaghMode(mode:D2ShemaghMode,material:THREE.Material):THREE.Group{
 const root=new THREE.Group();root.name='d2-wrap-'+mode;
 root.userData.d2WrapMode=mode;
 const parts:ClothCuboid[]=[];
 collarAndBib(parts);
 if(mode!=='draped')joinedFaceWrap(parts);
 if(mode==='head-wrap')crownWindings(parts);
 root.add(clothExterior('layered-shemagh-'+mode,parts,material));
 return root;
}
