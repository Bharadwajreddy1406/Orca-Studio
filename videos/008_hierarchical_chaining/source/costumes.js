// Costume props this Reel needs that the shared kit lacks: a chef's hat, a shopping basket and
// a party hat. The kit's createMember positions each prop node by its joint; these helpers only
// fill the nodes it could not draw, so reel/cast.js stays untouched.
import { createMember } from "../reel/cast.js";

const LINE = 'fill="none" stroke="var(--brand-ink)" stroke-width="2.3" stroke-linecap="round" stroke-linejoin="round"';
const PAPER = 'fill="var(--brand-background)" stroke="var(--brand-ink)" stroke-width="2.3" stroke-linejoin="round"';
const ACCENT = 'fill="var(--brand-accent)" stroke="var(--brand-ink)" stroke-width="1.6" stroke-linejoin="round"';

export const LOCAL_COSTUME = {
  chefHat: `<path ${PAPER} d="M-9 -8 L-9 -14 C-16 -14 -16 -24 -8 -23 C-7 -31 7 -31 8 -23 C16 -24 16 -14 9 -14 L9 -8 Z"/><path ${LINE} stroke-width="1.6" d="M-9 -11.5 L9 -11.5"/>`,
  basket: `<path ${LINE} stroke-width="2" d="M-6.5 3 C-6.5 -6 6.5 -6 6.5 3"/><path ${ACCENT} d="M-9.5 3 L9.5 3 L7 14 L-7 14 Z"/><path ${LINE} stroke-width="1.3" d="M-3.2 3 L-2.6 14 M3.2 3 L2.6 14 M-8.6 8 L8.6 8"/>`,
  partyHat: `<path ${ACCENT} d="M-8.5 -8.5 L1 -31 L8.5 -8.5 Z"/><path ${LINE} stroke-width="1.4" d="M-5.5 -15 L5.5 -13 M-3 -22 L3.5 -20.5"/><circle cx="1" cy="-32.5" r="3" ${PAPER}/>`,
};

/** Fill in the props the kit does not know. `props` is the list the member was created with. */
export function wearLocal(member, props) {
  const nodes = Array.from(member.group.children).slice(-props.length);
  props.forEach((prop, index) => {
    if (LOCAL_COSTUME[prop.art]) nodes[index].innerHTML = LOCAL_COSTUME[prop.art];
  });
  return member;
}

/** createMember, accepting this Reel's extra props as well as the kit's. */
export function createCostumed(parentSvg, options) {
  return wearLocal(createMember(parentSvg, options), options.props || []);
}
