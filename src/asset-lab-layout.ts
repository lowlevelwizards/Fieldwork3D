/** Stable map-space grid shared by models, labels, and selection outlines.
 * Small screens show four larger assets instead of twelve tiny overlapping labels.
 */
export type ShowroomGrid={
 columns:number;rows:number;pageSize:number;width:number;height:number;
};
const CELL_X=162,CELL_Y=146;
export function showroomGrid(viewportWidth:number):ShowroomGrid{
 const compact=viewportWidth<720;
 const columns=compact?2:4,rows=compact?2:3;
 return {columns,rows,pageSize:columns*rows,
   width:columns*CELL_X+42,height:rows*CELL_Y+42};
}
export function showroomSlot(index:number,grid:ShowroomGrid){
 return {x:106+(index%grid.columns)*CELL_X,
   y:105+Math.floor(index/grid.columns)*CELL_Y};
}
