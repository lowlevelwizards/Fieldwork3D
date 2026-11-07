/** Arsenal R11: stable relative magnification when changing very different guns.
 * In prior viewport code the camera only zoomed out on component swaps:
 * after viewing a long rifle a short MP5K stayed unnecessarily tiny.
 */
export function remapArsenalZoom(oldFit:number,oldDistance:number,nextFit:number):number{
 if(!Number.isFinite(nextFit)||nextFit<=0)return 51;
 const priorFit=Number.isFinite(oldFit)&&oldFit>0?oldFit:nextFit;
 const priorDistance=Number.isFinite(oldDistance)&&oldDistance>0?oldDistance:priorFit;
 const relative=Math.max(.65,Math.min(2.5,priorDistance/priorFit));
 return Math.max(18,Math.min(210,nextFit*relative));
}
