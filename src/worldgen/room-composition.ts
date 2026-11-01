/** MAP 06: meaningful furniture relationships, respecting existing site geometry.
 * Relative candidates are only suggestions; room furnishing validates actual
 * doors, movement clearance and nearby physical obstacles before accepting.
 */
import type {Room} from '../breach-site.ts';
import type {Obstacle,Pt} from '../breach-core.ts';
const by=(placed:readonly Obstacle[],fixture:string)=>placed.find(p=>p.fixture===fixture);
export function relatedFurniturePositions(room:Room,fixture:string,
  width:number,depth:number,placed:readonly Obstacle[]):Pt[]{
 const result:Pt[]=[];
 const offer=(x:number,y:number)=>{
  const margin=11;
  if(x-width/2>=room.x+margin&&x+width/2<=room.x+room.w-margin&&
     y-depth/2>=room.y+margin&&y+depth/2<=room.y+room.h-margin)
    result.push({x,y});
 };
 if(fixture==='tv-stand'){
  const sofa=by(placed,'sofa');
  if(sofa)offer(sofa.x,room.y+room.h-depth/2-14);
 }
 if(fixture==='coffee-table'){
  const sofa=by(placed,'sofa');
  if(sofa){
   const forward=sofa.y+sofa.h/2+depth/2+13;
   offer(sofa.x,forward);
   offer(sofa.x,sofa.y-sofa.h/2-depth/2-13);
  }
 }
 if(fixture==='nightstand'){
  const bed=by(placed,'bed');
  if(bed){
   const head=bed.y-bed.h*.22;
   offer(bed.x+bed.w/2+width/2+8,head);
   offer(bed.x-bed.w/2-width/2-8,head);
  }
 }
 if(fixture==='chair'||fixture==='office-chair'){
  const table=by(placed,fixture==='office-chair'?'desk':'dining-table')??
    by(placed,'meeting-table');
  if(table){
   offer(table.x+table.w/2+width/2+11,table.y);
   offer(table.x-table.w/2-width/2-11,table.y);
   offer(table.x,table.y+table.h/2+depth/2+11);
   offer(table.x,table.y-table.h/2-depth/2-11);
  }
 }
 if(fixture==='sink'||fixture==='stove'||fixture==='fridge'){
  const counter=by(placed,'counter');
  if(counter){
   offer(counter.x+counter.w/2+width/2+11,counter.y);
   offer(counter.x-counter.w/2-width/2-11,counter.y);
  }
 }
 if(fixture==='tool-chest'){
  const workbench=by(placed,'workbench');
  if(workbench){
   offer(workbench.x+workbench.w/2+width/2+10,workbench.y);
   offer(workbench.x-workbench.w/2-width/2-10,workbench.y);
  }
 }
 if(fixture==='armchair'){
  const sofa=by(placed,'sofa');
  if(sofa)offer(sofa.x+sofa.w/2+width/2+11,sofa.y);
 }
 return result;
}
