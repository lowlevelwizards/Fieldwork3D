/** R870 P14 front-end art and feed contracts.
 * Gameplay shot muzzle is taken from this same keyed profile; not an
 * independent moving cap. No new ammunition class or extra weapon slot.
 */
export type R870BarrelId='r870-18-bead'|'r870-14-bead';
export type R870TubeId='r870-standard-tube'|'r870-short-tube'|'r870-extended-tube';
export type R870PumpId='r870-police-wood-pump'|'r870-police-black-pump'|
 'r870-magpul-mlok-pump'|'r870-short-black-pump';
export const R870_BARRELS=Object.freeze({
 'r870-18-bead':Object.freeze({muzzleX:19.20,nominalInches:18,barrelStartX:.60}),
 'r870-14-bead':Object.freeze({muzzleX:15.36,nominalInches:14,barrelStartX:.60})
});
export const R870_TUBES=Object.freeze({
 'r870-standard-tube':Object.freeze({bodyEnd:13.91,capEnd:14.43,capacity:6}),
 'r870-short-tube':Object.freeze({bodyEnd:10.60,capEnd:11.12,capacity:4}),
 'r870-extended-tube':Object.freeze({bodyEnd:17.10,capEnd:17.62,capacity:8})
});
export const R870_PUMPS=Object.freeze({
 'r870-police-wood-pump':Object.freeze({startX:2.65,endX:11.50,material:'wood',pattern:'corncob'}),
 'r870-police-black-pump':Object.freeze({startX:2.65,endX:11.50,material:'polymer',pattern:'crossrib'}),
 'r870-magpul-mlok-pump':Object.freeze({startX:2.75,endX:11.20,material:'polymer',pattern:'mlok'}),
 'r870-short-black-pump':Object.freeze({startX:2.65,endX:9.80,material:'polymer',pattern:'crossrib'})
});
export function r870Barrel(id:string){return R870_BARRELS[id as R870BarrelId];}
export function r870Tube(id:string){return R870_TUBES[id as R870TubeId];}
export function r870Pump(id:string){return R870_PUMPS[id as R870PumpId];}
export function r870FrontCompatible(barrel:string,tube:string,pump:string):boolean{
 const b=r870Barrel(barrel),t=r870Tube(tube),p=r870Pump(pump);
 if(!b||!t||!p)return false;
 // A compact 14" muzzle never allows an exposed full-size magazine tube.
 if(b.nominalInches===14)return tube==='r870-short-tube'&&
  pump!=='r870-police-wood-pump'&&pump!=='r870-magpul-mlok-pump';
 return tube!=='r870-short-tube'&&pump!=='r870-short-black-pump';
}
export function r870DefaultFrontForBarrel(barrel:string){
 return r870Barrel(barrel)?.nominalInches===14?
  {tube:'r870-short-tube',pump:'r870-short-black-pump'} as const:
  {tube:'r870-standard-tube',pump:'r870-police-wood-pump'} as const;
}
