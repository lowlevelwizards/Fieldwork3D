/** Small, nonblocking acknowledgement for player-initiated preparation actions.
 * This is UI only; inventory, wardrobe and mission saves remain authoritative.
 */
let node:HTMLDivElement|null=null;
let timer:ReturnType<typeof setTimeout>|null=null;
let serial=0;
export function showFieldworkActionFeedback(message:string){
 if(typeof document==='undefined')return;
 if(!node){
  node=document.createElement('div');node.id='fieldworkActionToast';
  node.className='fw-action-toast';
  node.hidden=true;node.setAttribute('role','status');
  node.setAttribute('aria-live','polite');
  node.setAttribute('aria-atomic','true');
  document.body.append(node);
 }
 if(timer!==null){clearTimeout(timer);timer=null;}
 const version=++serial;
 node.textContent=message;
 node.hidden=false;node.dataset.state='visible';
 timer=setTimeout(()=>{
  if(version!==serial||!node)return;
  node.dataset.state='exiting';
  const closing=node;
  timer=setTimeout(()=>{
   if(version===serial)closing.hidden=true;
   timer=null;
  },160);
 },1600);
}
