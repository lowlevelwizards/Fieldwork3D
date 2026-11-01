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
 if(fixture==='tv-stand'||fixture==='coffee-table'){
  const sofa=by(placed,'sofa');
  if(sofa){
   const distance=fixture==='coffee-table'?12:31;
   const candidateOffsets=[
    {x:0,y:sofa.h/2+depth/2+distance},
    {x:0,y:-sofa.h/2-depth/2-distance},
    {x:sofa.w/2+width/2+distance,y:0},
    {x:-sofa.w/2-width/2-distance,y:0},
   ];
   // Prefer the side with the most useful room space, rather than always
   // placing the television north/south regardless of the wall geometry.
   candidateOffsets.sort((a,b)=>{
    const score=(d:Pt)=>{
     const x=sofa.x+d.x,y=sofa.y+d.y;
     return Math.min(x-room.x,room.x+room.w-x,
       y-room.y,room.y+room.h-y);
    };
    return score(b)-score(a);
   });
   for(const d of candidateOffsets)offer(sofa.x+d.x,sofa.y+d.y);
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
  if(sofa){
   const gap=sofa.w/2+width/2+11;
   offer(sofa.x+gap,sofa.y);
   offer(sofa.x-gap,sofa.y);
   offer(sofa.x,sofa.y+sofa.h/2+depth/2+15);
  }
 }
 if(fixture==='chair'&&!by(placed,'dining-table')&&!by(placed,'meeting-table')){
  const first=by(placed,'chair');
  if(first){
   // Bank waiting-room chairs along the same practical sightline.
   const gap=first.w/2+width/2+12;
   offer(first.x+gap,first.y);offer(first.x-gap,first.y);
  }
 }
 if(fixture==='instrument-cart'||fixture==='cart'){
  const anchor=by(placed,'exam-bed')??by(placed,'workbench')??
   by(placed,'packing-station');
  if(anchor){
   const gap=anchor.w/2+width/2+13;
   offer(anchor.x+gap,anchor.y);offer(anchor.x-gap,anchor.y);
  }
 }
 if(fixture==='filing-cabinet'||fixture==='bookcase'){
  const desk=by(placed,'desk');
  if(desk){
   offer(desk.x+desk.w/2+width/2+12,desk.y);
   offer(desk.x-desk.w/2-width/2-12,desk.y);
  }
 }
 return result;
}
