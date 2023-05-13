import {getComputedStyle} from './getComputedStyle';
import {getWindow} from './getWindow';
import {getNodeName} from './node';

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

export function isShadowRoot(node: Node): node is ShadowRoot {
  // Browsers without `ShadowRoot` support.
  if (typeof ShadowRoot === 'undefined') {
    return false;
  }

  const OwnElement = getWindow(node).ShadowRoot;
  return node instanceof OwnElement || node instanceof ShadowRoot;
}

export function isOverflowElement(element: Element): boolean {
  const {overflow, overflowX, overflowY, display} = getComputedStyle(element);
  return (
    /auto|scroll|overlay|hidden|clip/.test(overflow + overflowY + overflowX) &&
    !['inline', 'contents'].includes(display)
  );
}

export function isTableElement(element: Element): boolean {
  return ['table', 'td', 'th'].includes(getNodeName(element));
}

export function isContainingBlock(element: Element): boolean {
  const safari = isSafari();
  const css = getComputedStyle(element);
  const backdropFilter =
    css.backdropFilter || (css as any).WebkitBackdropFilter;

  // This is non-exhaustive but covers the most common CSS properties that
  // create a containing block.
  // https://developer.mozilla.org/en-US/docs/Web/CSS/Containing_block#identifying_the_containing_block
  return (
    css.transform !== 'none' ||
    css.perspective !== 'none' ||
    (backdropFilter ? backdropFilter !== 'none' : false) ||
    (!safari && css.willChange === 'filter') ||
    (!safari && (css.filter ? css.filter !== 'none' : false)) ||
    ['transform', 'perspective'].some((value) =>
      css.willChange.includes(value)
    ) ||
    ['paint', 'layout', 'strict', 'content'].some((value) => {
      // Add type check for old browsers.
      const contain = css.contain as string | undefined;
      return contain != null ? contain.includes(value) : false;
    })
  );
}

export function isSafari(): boolean {
  if (typeof CSS === 'undefined' || !CSS.supports) return false;
  return CSS.supports('-webkit-backdrop-filter', 'none');
}

export function isLastTraversableNode(node: Node) {
  return ['html', 'body', '#document'].includes(getNodeName(node));
}
