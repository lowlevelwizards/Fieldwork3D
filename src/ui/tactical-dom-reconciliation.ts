/** E1.C — small presentation-only DOM equality guards.
 * Browser DOM setters can schedule style/layout work even if the same value is
 * assigned again. No state cache, scheduling, or gameplay authority lives here.
 */
export function writeDomText(node:Pick<Node,'textContent'>,next:string):void{
 if(node.textContent!==next)node.textContent=next;
}
export function writeDomAttribute(
 node:Pick<Element,'getAttribute'|'setAttribute'>,
 name:string,next:string):void{
 if(node.getAttribute(name)!==next)node.setAttribute(name,next);
}
export function writeDomStyle(
 node:Pick<HTMLElement,'style'>,name:string,next:string):void{
 if(node.style.getPropertyValue(name)!==next)node.style.setProperty(name,next);
}

/** R7.2: guard common DOM properties as well as text/ARIA/style. */
export function writeDomHidden(node:Pick<HTMLElement,'hidden'>,next:boolean):void{
 if(node.hidden!==next)node.hidden=next;
}
export function writeDomDisabled(
 node:Pick<HTMLButtonElement,'disabled'>,next:boolean):void{
 if(node.disabled!==next)node.disabled=next;
}
export function writeDomTitle(node:Pick<HTMLElement,'title'>,next:string):void{
 if(node.title!==next)node.title=next;
}
export function writeDomClass(
 node:Pick<Element,'classList'>,name:string,enabled:boolean):void{
 if(node.classList.contains(name)!==enabled)node.classList.toggle(name,enabled);
}
export function writeDomOptionalAttribute(
 node:Pick<Element,'getAttribute'|'setAttribute'|'removeAttribute'>,
 name:string,next:string|null):void{
 if(next===null){
  if(node.getAttribute(name)!==null)node.removeAttribute(name);
 }else writeDomAttribute(node,name,next);
}
export function clearDomStyle(node:Pick<HTMLElement,'style'>,name:string):void{
 if(node.style.getPropertyValue(name))node.style.removeProperty(name);
}
