/** One single-RAF thumbnail queue for both Arsenal galleries.
 * A hidden category pauses queued GPU work; disposal invalidates late frames.
 */
export function createArsenalPreviewQueue(){
 type Job={host:HTMLElement;paint:()=>void};
 const pending:Job[]=[];
 const revisions=new WeakMap<HTMLElement,number>();
 let frame:number|null=null;
 let disposed=false,paused=false,generation=0;
 const schedule=()=>{
  if(disposed||paused||frame!==null||!pending.length)return;
  const token=generation;
  frame=requestAnimationFrame(()=>{
   if(disposed||paused||token!==generation)return;
   frame=null;
   const next=pending.shift();
   try{next?.paint();}finally{schedule();}
  });
 };
 const enqueue=(host:HTMLElement,render:()=>void,priority=false)=>{
  if(disposed)return;
  const revision=(revisions.get(host)??0)+1;
  revisions.set(host,revision);
  for(let i=pending.length-1;i>=0;i--)
   if(pending[i].host===host)pending.splice(i,1);
  const job:Job={host,paint:()=>{
   if(host.isConnected&&revisions.get(host)===revision)render();
  }};
  if(priority)pending.unshift(job);else pending.push(job);
  schedule();
 };
 const pruneDetached=()=>{
  for(let i=pending.length-1;i>=0;i--)
   if(!pending[i].host.isConnected)pending.splice(i,1);
 };
 const cancel=()=>{
  generation++;
  if(frame!==null)cancelAnimationFrame(frame);
  frame=null;
 };
 const setPaused=(value:boolean)=>{
  if(disposed||paused===value)return;
  paused=value;
  if(paused)cancel();else{pruneDetached();schedule();}
 };
 const dispose=()=>{
  if(disposed)return;
  disposed=true;pending.length=0;cancel();
 };
 return {enqueue,pruneDetached,setPaused,dispose};
}
