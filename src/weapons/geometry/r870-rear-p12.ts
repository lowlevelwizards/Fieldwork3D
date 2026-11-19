/** R870 P12: pure, game-art rear furniture silhouette contract.
 * The receiver mounting interface is shared; grip silhouettes are NOT.
 * Local artwork: +X muzzle, +Y up, +Z ejection side. No gameplay changes.
 */
export type R870Point=readonly [number,number];
export type R870Outline=readonly R870Point[];
export type R870RearVariant='wood'|'shortwood'|'poly'|'sga'|'pistol'|'mcs'|'birdshead';
export const R870_REAR_JOIN=Object.freeze({
 receiverTop:[-6.12,.76] as R870Point,
 receiverBottom:[-6.12,-1.76] as R870Point,
 extensionTop:[-10.45,-.15] as R870Point,
 extensionBottom:[-10.45,-3.10] as R870Point
});
/** Long grip first: leave receiver, DROP on top, then rebuild rearward. */
export const R870_WOOD_GRIP:R870Outline=[
 R870_REAR_JOIN.extensionTop,[-9.50,-.55],[-8.60,-.55],
 [-7.55,-.04],R870_REAR_JOIN.receiverTop,
 R870_REAR_JOIN.receiverBottom,[-7.10,-1.85],
 [-7.90,-2.36],[-8.80,-3.04],[-9.55,-3.21],
 R870_REAR_JOIN.extensionBottom
];
export const R870_WOOD_STOCK:R870Outline=[
 [-15.26,.34],[-13.25,.30],[-11.30,.05],
 R870_REAR_JOIN.extensionTop,R870_REAR_JOIN.extensionBottom,
 [-12.50,-3.60],[-15.26,-4.02]
];
/** P14 SGA is an authored angular stock, not a recolored Police stock.
 * Shared receiver interface and shoulder datum; grip has its own low heel.
 */
export const R870_SGA_GRIP:R870Outline=[
 R870_REAR_JOIN.extensionTop,[-9.70,-.45],[-8.85,-.72],
 [-7.45,-.38],R870_REAR_JOIN.receiverTop,
 R870_REAR_JOIN.receiverBottom,[-7.25,-1.95],
 [-7.75,-2.66],[-8.55,-3.25],[-9.58,-3.46],
 R870_REAR_JOIN.extensionBottom
];
export const R870_SGA_STOCK:R870Outline=[
 [-14.56,.45],[-13.40,.28],[-11.90,.00],
 R870_REAR_JOIN.extensionTop,R870_REAR_JOIN.extensionBottom,
 [-11.70,-2.92],[-12.70,-3.28],[-14.56,-3.87]
];
/** P16 mobile silhouette: a compact, close-to-vertical pistol grip with an
 * integral socket, defined backstrap, palm swell and faceted bottom heel.
 * The former long diagonal wedge read as a detached birdshead handle.
 * Both stockless and MCS-shouldered variants use this exact same grip.
 */
export const R870_PISTOL_GRIP:R870Outline=[
 R870_REAR_JOIN.receiverTop,[-7.03,.17],[-7.68,-.76],
 [-8.48,-1.70],[-8.99,-2.18],[-9.54,-4.44],
 [-9.48,-4.94],[-8.85,-5.19],[-8.10,-5.05],
 [-7.72,-4.64],[-7.40,-2.66],R870_REAR_JOIN.receiverBottom
];
export const R870_BIRDSHEAD_GRIP:R870Outline=[
 R870_REAR_JOIN.receiverTop,[-7.36,.30],[-9.04,-.22],
 [-11.34,-1.22],[-12.13,-2.08],[-12.20,-2.92],
 [-11.54,-3.49],[-10.80,-3.55],[-9.86,-2.84],
 [-8.36,-1.99],R870_REAR_JOIN.receiverBottom
];
export const R870_REAR_PARTS=Object.freeze({
 poly:Object.freeze({
  stock:'r870-police-poly-stock',grip:'r870-police-poly-grip',
  stockX:-15.78,primaryX:-7.80,primaryY:-2.70,hasShoulder:true,
  gripOutline:R870_WOOD_GRIP,stockOutline:R870_WOOD_STOCK
 }),
 sga:Object.freeze({
  stock:'r870-magpul-sga-stock',grip:'r870-magpul-sga-grip',
  stockX:-15.24,primaryX:-8.00,primaryY:-2.82,hasShoulder:true,
  gripOutline:R870_SGA_GRIP,stockOutline:R870_SGA_STOCK
 }),
 shortwood:Object.freeze({
  stock:'r870-short-wood-stock',grip:'r870-police-wood-wrist',
  stockX:-13.78,primaryX:-7.80,primaryY:-2.70,hasShoulder:true,
  gripOutline:R870_WOOD_GRIP,stockOutline:[
   [-13.26,.28],[-12.30,.24],[-11.25,.04],
   R870_REAR_JOIN.extensionTop,R870_REAR_JOIN.extensionBottom,
   [-12.0,-3.55],[-13.26,-3.85]
  ] as R870Outline
 }),
 wood:Object.freeze({
  stock:'r870-police-wood-stock',grip:'r870-police-wood-wrist',
  stockX:-15.78,primaryX:-7.80,primaryY:-2.70,hasShoulder:true,
  gripOutline:R870_WOOD_GRIP,stockOutline:R870_WOOD_STOCK
 }),
 pistol:Object.freeze({
  stock:'r870-pistol-only',grip:'r870-pistol-grip',
  stockX:-9.54,primaryX:-8.45,primaryY:-3.10,hasShoulder:false,
  gripOutline:R870_PISTOL_GRIP,stockOutline:null
 }),
 mcs:Object.freeze({
  stock:'r870-mcs-skeletal-stock',grip:'r870-pistol-grip',
  stockX:-14.40,primaryX:-8.45,primaryY:-3.10,hasShoulder:true,
  gripOutline:R870_PISTOL_GRIP,stockOutline:null
 }),
 birdshead:Object.freeze({
  stock:'r870-birdshead-only',grip:'r870-birdshead-grip',
  stockX:-12.20,primaryX:-9.35,primaryY:-2.65,hasShoulder:false,
  gripOutline:R870_BIRDSHEAD_GRIP,stockOutline:null
 })
});
export function r870RearFromGrip(id:string):R870RearVariant|undefined{
 if(id===R870_REAR_PARTS.wood.grip)return 'wood';
 return (Object.keys(R870_REAR_PARTS) as R870RearVariant[])
  .find(key=>R870_REAR_PARTS[key].grip===id);
}
export function r870RearFromStock(id:string):R870RearVariant|undefined{
 return (Object.keys(R870_REAR_PARTS) as R870RearVariant[])
  .find(key=>R870_REAR_PARTS[key].stock===id);
}
export function r870RearPair(stock:string,grip:string):R870RearVariant|undefined{
 const key=r870RearFromStock(stock);
 return key&&R870_REAR_PARTS[key].grip===grip?key:undefined;
}
