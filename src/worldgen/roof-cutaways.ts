/** MAP 15: roofs must never disclose unexplored room geometry or
 * obscure rooms occupied by the player's operators.
 */
export function roofShouldShow(
 omniscient:boolean,known:boolean,occupied:boolean):boolean{
 return !omniscient&&known&&!occupied;
}
