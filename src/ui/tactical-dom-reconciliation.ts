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
