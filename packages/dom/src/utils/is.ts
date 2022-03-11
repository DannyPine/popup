import {getComputedStyle} from './getComputedStyle';
import {getNodeName} from './getNodeName';
import {getWindow} from './window';

declare global {
  interface Window {
    HTMLElement: any;
    Element: any;
    Node: any;
    ShadowRoot: any;
  }
}

export function isHTMLElement(value: any): value is HTMLElement {
  return value instanceof getWindow(value).HTMLElement;
}

export function isElement(value: any): value is Element {
  return value instanceof getWindow(value).Element;
}

export function isNode(value: any): value is Node {
  return value instanceof getWindow(value).Node;
}

export function isShadowRoot(node: Node): node is ShadowRoot {
  const OwnElement = getWindow(node).ShadowRoot;
  return node instanceof OwnElement || node instanceof ShadowRoot;
}

export function isOverflowElement(element: HTMLElement): boolean {
  // Firefox wants us to check `-x` and `-y` variations as well
  const {overflow, overflowX, overflowY} = getComputedStyle(element);
  return /auto|scroll|overlay|hidden/.test(overflow + overflowY + overflowX);
}

export function isTableElement(element: Element): boolean {
  return ['table', 'td', 'th'].includes(getNodeName(element));
}

export function isContainingBlock(element: Element): boolean {
  // TODO: Try and use feature detection here instead
  const isFirefox = navigator.userAgent.toLowerCase().includes('firefox');
  const css = getComputedStyle(element);

  // This is non-exhaustive but covers the most common CSS properties that
  // create a containing block.
  // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
  return (
    css.transform !== 'none' ||
    css.perspective !== 'none' ||
    css.contain === 'paint' ||
    ['transform', 'perspective'].includes(css.willChange) ||
    (isFirefox && css.willChange === 'filter') ||
    (isFirefox && (css.filter ? css.filter !== 'none' : false))
  );
}

// Chrome returns a number very close to 0 (+/- 0.0001 or less), while Safari
// returns any number >= 0. This check is only relevant when pinch-zooming, when
// it will be > 0.5.
export function isLayoutViewport(win: Window): boolean {
  const vV = win.visualViewport;
  return vV ? Math.abs(win.innerWidth / vV.scale - vV.width) < 0.5 : true;
}
