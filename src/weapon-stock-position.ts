/** Explicit, saved physical stock position; no phantom folding inferred
 * from the factory stock's part name. Legacy saves omit it = deployed.
 * Foldable and telescoping stocks use different mechanical states.
 */
export type WeaponStockPosition='deployed'|'folded'|'collapsed';
const FOLDABLE=new Set([
 'ak-sidefold','ak-sidefold-plum','ak-skeleton','ak-triangle-full',
 'ak-triangle-padded','ak-underfolder','hk-mp5k-pdw-stock',
 'fal-para-folder','fnc-tube-folder','g36-stock'
]);
const TELESCOPING=new Set([
 'ar-car','ar-stock-m4','ar-compact','hk-g3-retract-stock',
 'hk33-retract-stock','hk53-retract-stock','hk-mp5-retract-stock'
]);
export function alternateStockPosition(stockId:string):'folded'|'collapsed'|null{
 return FOLDABLE.has(stockId)?'folded':TELESCOPING.has(stockId)?'collapsed':null;
}
export function normalizedStockPosition(stockId:string,requested:unknown):
 WeaponStockPosition{
 return requested===alternateStockPosition(stockId)?requested:'deployed';
}
/** Unscaled rear solid-body/receiver extension for clearance and shoulder
 * pose. Folded stocks are not shouldered; this value is a receiver endcap.
 */
export function positionedStockX(stockId:string,baseX:number,
 position:WeaponStockPosition):number{
 if(position==='deployed')return baseX;
 if(position==='folded')return stockId==='hk-mp5k-pdw-stock'?-6.65:-6.10;
 return Math.min(-7.0,baseX+4.8);
}
/** The same hinge anchors drive the visible stock mesh. */
export function stockHingeX(stockId:string):number{
 return stockId.startsWith('hk-')?-6.5:
  stockId==='g36-stock'?-5.3:
  stockId.startsWith('fal-')?-6.1:
  stockId.startsWith('fnc-')?-6.2:-5.9;
}
export function isUnderfoldStock(stockId:string):boolean{
 return stockId==='ak-underfolder';
}
