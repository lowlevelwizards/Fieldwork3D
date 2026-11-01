/** Door-spanning tree over already-authored physical room edges.
 * Avoid turning private rooms into through-traffic when a service/hall route
 * exists. This is a weighted preference, never an excuse to disconnect a
 * building that has no other viable circulation.
 */
const privateRooms=new Set(['bedroom','bathroom','restroom','guest','exam','treatment']);
export type PassageCandidate={
 a:number;b:number;score:number;
 /** Free means the neighboring room cells are already physically open. */
 free:boolean;
 /** A true opening is possible and does not violate unit ownership. */
 eligible:boolean;
};
export function chooseCirculationTree(roles:readonly string[],
 edges:readonly PassageCandidate[]):Set<number>{
 const parents=roles.map((_,i)=>i),degree=roles.map(()=>0);
 const root=(idx:number):number=>{
  while(parents[idx]!==idx)idx=parents[idx];
  return idx;
 };
 const connect=(a:number,b:number)=>{
  const x=root(a),y=root(b);
  if(x===y)return false;
  parents[y]=x;
  return true;
 };
 const selected=new Set<number>();
 edges.forEach((edge,i)=>{
  if(edge.free){
   selected.add(i);connect(edge.a,edge.b);
  }
 });
 // Re-evaluate the cost after each new door; a fixed edge sort cannot detect
 // that a bedroom has already acquired an entrance and is becoming a corridor.
 for(let step=0;step<roles.length-1;step++){
  let best=-1,bestCost=Infinity;
  for(let i=0;i<edges.length;i++){
   const edge=edges[i];
   if(selected.has(i)||!edge.eligible||root(edge.a)===root(edge.b))continue;
   let cost=edge.score;
   if(privateRooms.has(roles[edge.a])&&degree[edge.a]>0)cost+=180;
   if(privateRooms.has(roles[edge.b])&&degree[edge.b]>0)cost+=180;
   if(cost<bestCost){bestCost=cost;best=i;}
  }
  if(best<0)break;
  const edge=edges[best];
  selected.add(best);connect(edge.a,edge.b);
  degree[edge.a]++;degree[edge.b]++;
 }
 return selected;
}
