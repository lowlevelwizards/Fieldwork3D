/** One bounded, single-RAF thumbnail queue for both Arsenal galleries.
 * The gallery owns WebGL and models. This utility only schedules presentation
 * work and retires jobs for replaced/offscreen hosts.
 */
export function createArsenalPreviewQueue(){
 type Job={host:HTMLElement;paint:()=>void};
 const pending:Job[]=[];
 const revisions=new WeakMap<HTMLElement,number>();
 let frame:number|null=null;
 let disposed=false;
 const pump=()=>{
  frame=null;
  if(disposed)return;
  const next=pending.shift();
  next?.paint();
  // A render can enqueue work while this pump is running. It may already
  // have scheduled the next frame; never create a second RAF chain.
  if(pending.length&&frame===null)frame=requestAnimationFrame(pump);
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
  if(frame===null)frame=requestAnimationFrame(pump);
 };
 const pruneDetached=()=>{
  for(let i=pending.length-1;i>=0;i--)
   if(!pending[i].host.isConnected)pending.splice(i,1);
 };
 const dispose=()=>{
  if(disposed)return;
  disposed=true;
  pending.length=0;
  if(frame!==null)cancelAnimationFrame(frame);
  frame=null;
 };
 return {enqueue,pruneDetached,dispose};
}
