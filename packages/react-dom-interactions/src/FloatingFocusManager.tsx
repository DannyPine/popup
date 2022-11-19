import {hideOthers} from 'aria-hidden';
import {tabbable} from 'tabbable';
import * as React from 'react';
import {usePortalContext} from './FloatingPortal';
import {useFloatingTree} from './FloatingTree';
import type {FloatingContext, ReferenceType} from './types';
import {activeElement} from './utils/activeElement';
import {FocusGuard} from './utils/FocusGuard';
import {getAncestors} from './utils/getAncestors';
import {getChildren} from './utils/getChildren';
import {getDocument} from './utils/getDocument';
import {getTarget} from './utils/getTarget';
import {isElement, isHTMLElement} from './utils/is';
import {isTypeableElement} from './utils/isTypeableElement';
import {stopEvent} from './utils/stopEvent';
import {useLatestRef} from './utils/useLatestRef';

function focus(el: HTMLElement | undefined, preventScroll = false) {
  // `mousedown` clicks occur before `focus`, so the button will steal the
  // focus unless we wait a frame.
  requestAnimationFrame(() => {
    el?.focus({preventScroll});
  });
}

export interface Props<RT extends ReferenceType = ReferenceType> {
  context: FloatingContext<RT>;
  children: JSX.Element;
  order?: Array<'reference' | 'floating' | 'content'>;
  initialFocus?: number | React.MutableRefObject<HTMLElement | null>;
  guards?: boolean;
  returnFocus?: boolean;
  modal?: boolean;
}

/**
 * Provides focus management for the floating element.
 * @see https://floating-ui.com/docs/FloatingFocusManager
 */
export function FloatingFocusManager<RT extends ReferenceType = ReferenceType>({
  context: {refs, nodeId, onOpenChange, dataRef, events},
  children,
  order = ['content'],
  guards = true,
  initialFocus = 0,
  returnFocus = true,
  modal = true,
}: Props<RT>): JSX.Element {
  const orderRef = useLatestRef(order);
  const tree = useFloatingTree();
  const portalContext = usePortalContext();

  const didFocusOutRef = React.useRef(false);

  const insidePortal = portalContext != null;

  const getTabbableElements = React.useCallback(
    (container: HTMLElement | null = refs.floating.current) => {
      return orderRef.current
        .map((type) => {
          if (refs.domReference.current && type === 'reference') {
            return refs.domReference.current;
          }

          if (refs.floating.current && type === 'floating') {
            return refs.floating.current;
          }

          if (container && type === 'content') {
            return tabbable(container, {getShadowRoot: true});
          }

          return null;
        })
        .flat() as Array<HTMLElement>;
    },
    [orderRef, refs]
  );

  React.useEffect(() => {
    if (!modal) {
      return;
    }

    // If the floating element has no focusable elements inside it, fallback
    // to focusing the floating element and preventing tab navigation
    const noTabbableContentElements =
      getTabbableElements().filter(
        (el) => el !== refs.floating.current && el !== refs.domReference.current
      ).length === 0;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        if (noTabbableContentElements) {
          stopEvent(event);
        }

        const els = getTabbableElements();
        const target = getTarget(event);

        if (
          orderRef.current[0] === 'reference' &&
          target === refs.domReference.current
        ) {
          stopEvent(event);
          if (event.shiftKey) {
            focus(els[els.length - 1]);
          } else {
            focus(els[1]);
          }
        }

        if (
          orderRef.current[1] === 'floating' &&
          target === refs.floating.current &&
          event.shiftKey
        ) {
          stopEvent(event);
          focus(els[0]);
        }
      }
    }

    const doc = getDocument(refs.floating.current);
    doc.addEventListener('keydown', onKeyDown);
    return () => {
      doc.removeEventListener('keydown', onKeyDown);
    };
  }, [modal, getTabbableElements, orderRef, refs]);

  React.useEffect(() => {
    let isPointerDown = false;

    function onFocusOut(event: FocusEvent) {
      didFocusOutRef.current = false;
      const relatedTarget = event.relatedTarget as Element | null;

      if (
        relatedTarget == null ||
        relatedTarget === portalContext?.beforeOutsideRef.current ||
        relatedTarget === portalContext?.afterOutsideRef.current
      ) {
        return;
      }

      if (
        relatedTarget === portalContext?.beforeInsideRef.current ||
        relatedTarget === portalContext?.afterInsideRef.current
      ) {
        didFocusOutRef.current = true;
        return;
      }

      const focusMovedOutsideFloating =
        !refs.floating.current?.contains(relatedTarget);

      const focusMovedOutsideReference =
        isElement(refs.domReference.current) &&
        !refs.domReference.current.contains(relatedTarget);

      const isChildOpen =
        tree && getChildren(tree.nodesRef.current, nodeId).length > 0;

      const isParentRelated =
        tree &&
        event.currentTarget === refs.domReference.current &&
        getAncestors(tree.nodesRef.current, nodeId)?.some((node) =>
          node.context?.refs.floating.current?.contains(relatedTarget)
        );

      if (
        focusMovedOutsideFloating &&
        focusMovedOutsideReference &&
        !isChildOpen &&
        !isParentRelated &&
        !isPointerDown
      ) {
        didFocusOutRef.current = true;
        onOpenChange(false);
      }
    }

    function onPointerDown() {
      // In Safari, buttons *lose* focus when pressing them. This causes the
      // reference `focusout` to fire, which closes the floating element.
      isPointerDown = true;
      setTimeout(() => {
        isPointerDown = false;
      });
    }

    const floating = refs.floating.current;
    const reference = refs.domReference.current;

    if (floating && isHTMLElement(reference)) {
      if (!modal) {
        floating.addEventListener('focusout', onFocusOut);
        reference.addEventListener('focusout', onFocusOut);
        reference.addEventListener('pointerdown', onPointerDown);
      }

      let cleanup: () => void;
      if (modal) {
        if (orderRef.current.includes('reference')) {
          cleanup = hideOthers([reference, floating]);
        } else {
          cleanup = hideOthers(floating);
        }
      }

      return () => {
        if (!modal) {
          floating.removeEventListener('focusout', onFocusOut);
          reference.removeEventListener('focusout', onFocusOut);
          reference.removeEventListener('pointerdown', onPointerDown);
        }

        cleanup?.();
      };
    }
  }, [
    nodeId,
    tree,
    modal,
    onOpenChange,
    orderRef,
    dataRef,
    getTabbableElements,
    refs,
    portalContext,
  ]);

  React.useEffect(() => {
    const floating = refs.floating.current;
    const doc = getDocument(floating);

    let returnFocusValue = returnFocus;
    let preventReturnFocusScroll = false;
    let previouslyFocusedElement = activeElement(doc);

    if (previouslyFocusedElement === doc.body && refs.domReference.current) {
      previouslyFocusedElement = refs.domReference.current;
    }

    if (typeof initialFocus === 'number') {
      const el = getTabbableElements()[initialFocus] ?? floating;
      focus(el, el === floating);
    } else if (isHTMLElement(initialFocus.current)) {
      const el = initialFocus.current ?? floating;
      focus(el, el === floating);
    }

    // Dismissing via outside press should always ignore `returnFocus` to
    // prevent unwanted scrolling.
    function onDismiss(
      allowReturnFocus: boolean | {preventScroll: boolean} = false
    ) {
      if (typeof allowReturnFocus === 'object') {
        returnFocusValue = true;
        preventReturnFocusScroll = allowReturnFocus.preventScroll;
      } else {
        returnFocusValue = allowReturnFocus;
      }
    }

    events.on('dismiss', onDismiss);

    return () => {
      events.off('dismiss', onDismiss);

      if (
        returnFocusValue &&
        isHTMLElement(previouslyFocusedElement) &&
        !didFocusOutRef.current
      ) {
        focus(previouslyFocusedElement, preventReturnFocusScroll);
      }
    };
  }, [getTabbableElements, initialFocus, returnFocus, refs, events]);

  React.useEffect(() => {
    if (modal && !guards) {
      const tabIndexValues: Array<string | null> = [];
      const elements = tabbable(document.body, {getShadowRoot: true}).filter(
        (el) => !refs.floating.current?.contains(el)
      );

      elements.forEach((el, i) => {
        tabIndexValues[i] = el.getAttribute('tabindex');
        el.setAttribute('tabindex', '-1');
      });

      return () => {
        elements.forEach((el, i) => {
          const value = tabIndexValues[i];
          if (value == null) {
            el.removeAttribute('tabindex');
          } else {
            el.setAttribute('tabindex', value);
          }
        });
      };
    }
  }, [modal, guards, refs]);

  React.useImperativeHandle(portalContext?.managerRef, () => ({
    handleBeforeOutside: () => {
      focus(getTabbableElements()[0]);
    },
    handleAfterOutside: () => {
      const els = getTabbableElements();
      focus(els[els.length - 1]);
    },
  }));

  const isTypeableCombobox = () =>
    refs.domReference.current?.getAttribute('role') === 'combobox' &&
    isTypeableElement(refs.domReference.current);

  const renderGuards = guards && (insidePortal || modal);

  return (
    <>
      {renderGuards && (
        <FocusGuard
          ref={portalContext?.beforeInsideRef}
          onFocus={(event) => {
            if (isTypeableCombobox()) {
              return;
            }

            stopEvent(event);

            if (modal) {
              const els = getTabbableElements();
              if (order[0] === 'reference') {
                focus(els[0]);
              } else {
                focus(els[els.length - 1]);
              }
            } else if (portalContext?.preserveTabOrder) {
              const els = getTabbableElements(document.body);
              // @ts-expect-error
              const index = els.indexOf(portalContext.beforeOutsideRef.current);
              const prevTabbable = els[index - 1];
              focus(prevTabbable);
              if (prevTabbable !== refs.domReference.current) {
                onOpenChange(false);
              }
            }
          }}
        />
      )}
      {React.cloneElement(
        children,
        order.includes('floating') ? {tabIndex: 0} : {}
      )}
      {renderGuards && (
        <FocusGuard
          ref={portalContext?.afterInsideRef}
          onFocus={(event) => {
            if (isTypeableCombobox()) {
              return;
            }

            stopEvent(event);

            if (modal) {
              focus(getTabbableElements()[0]);
            } else if (portalContext?.preserveTabOrder) {
              const els = getTabbableElements(document.body);
              // @ts-expect-error
              const index = els.indexOf(portalContext.afterOutsideRef.current);
              const nextTabbable = els[index + 1];
              focus(nextTabbable);
              if (nextTabbable !== refs.domReference.current) {
                onOpenChange(false);
              }
            }
          }}
        />
      )}
    </>
  );
}
