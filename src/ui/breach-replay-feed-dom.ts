/** E4.H: session-local filtered feed and bounded DOM window.
 * Only events that already passed replay disclosure may be supplied.
 * Neither helper stores a recorder, observer, historical knowledge or poses.
 */
export class ReplayFeedFilterCache<T extends {kind:string}>{
 private source:readonly T[]|null=null;
 private filter:string|null=null;
 private result:readonly T[]=[];
 get(events:readonly T[],filter:string,
   kinds:Readonly<Record<string,readonly string[]>>):readonly T[]{
  if(events!==this.source||filter!==this.filter){
   const allowed=kinds[filter]??[];
   this.result=allowed.length?
     events.filter(event=>allowed.includes(event.kind)):events;
   this.source=events;
   this.filter=filter;
  }
  return this.result;
 }
 clear():void{this.source=null;this.filter=null;this.result=[];}
}

/** One listener per visible event node; overlapping windows reuse their
 * original nodes. Key comparisons preserve duplicate historical event keys.
 * The DOM is rebuilt only when the bounded interval/source actually changes.
 */
export class ReplayFeedDomWindow<T extends {key:string}>{
 private source:readonly T[]|null=null;
 private start=-1;
 private end=-1;
 private selectedKey:string|null=null;
 private nodes=new Map<number,HTMLButtonElement>();
 private selectedNodes=new Map<string,HTMLButtonElement[]>();
 constructor(private readonly container:HTMLElement){}
 render(events:readonly T[],start:number,end:number,key:string|null,
   create:(event:T)=>HTMLButtonElement):boolean{
  if(this.source!==events){
   this.source=events;this.start=-1;this.end=-1;
   this.selectedKey=null;this.nodes.clear();this.selectedNodes.clear();
  }
  if(this.start===start&&this.end===end){
   this.select(key);return false;
  }
  const active=this.container.ownerDocument.activeElement;
  const focused=[...this.nodes].find(([,button])=>button===active)?.[0];
  const next=new Map<number,HTMLButtonElement>();
  const selected=new Map<string,HTMLButtonElement[]>();
  for(let i=start;i<end;i++){
   const event=events[i];
   const button=this.nodes.get(i)??create(event);
   button.classList.toggle('selected',event.key===key);
   next.set(i,button);
   const same=selected.get(event.key);
   if(same)same.push(button);
   else selected.set(event.key,[button]);
  }
  this.container.replaceChildren(...next.values());
  this.start=start;this.end=end;this.nodes=next;
  this.selectedNodes=selected;this.selectedKey=key;
  // If a following-time window removes a keyboard-focused event, keep the
  // user's place on the nearest visible entry rather than losing focus.
  if(focused!==undefined&&next.size){
   const target=next.get(Math.min(end-1,Math.max(start,focused)));
   if(target&&this.container.ownerDocument.activeElement!==target)
     target.focus({preventScroll:true});
  }
  return true;
 }
 select(key:string|null):void{
  if(key===this.selectedKey)return;
  if(this.selectedKey!==null)
   for(const button of this.selectedNodes.get(this.selectedKey)??[])
     button.classList.toggle('selected',false);
  if(key!==null)
   for(const button of this.selectedNodes.get(key)??[])
     button.classList.toggle('selected',true);
  this.selectedKey=key;
 }
 clear():void{
  this.source=null;this.start=-1;this.end=-1;
  this.selectedKey=null;this.nodes.clear();this.selectedNodes.clear();
  this.container.replaceChildren();
 }
 get renderedCount():number{return this.nodes.size;}
}
