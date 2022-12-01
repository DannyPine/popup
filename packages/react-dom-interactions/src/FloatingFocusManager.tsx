import {hideOthers} from 'aria-hidden';
import {focusable, FocusableElement, tabbable} from 'tabbable';
import * as React from 'react';
import useLayoutEffect from 'use-isomorphic-layout-effect';
import {usePortalContext} from './FloatingPortal';
import {useFloatingTree} from './FloatingTree';
import type {FloatingContext, ReferenceType} from './types';
import {activeElement} from './utils/activeElement';
import {FocusGuard, HIDDEN_STYLES} from './utils/FocusGuard';
import {getDocument} from './utils/getDocument';
import {getTarget} from './utils/getTarget';
import {isHTMLElement} from './utils/is';
import {isTypeableElement} from './utils/isTypeableElement';
import {stopEvent} from './utils/stopEvent';
import {useLatestRef} from './utils/useLatestRef';
import {
  getNextTabbable,
  getPreviousTabbable,
  getTabbableOptions,
  isOutsideEvent,
} from './utils/tabbable';
import {getChildren} from './utils/getChildren';
import {enqueueFocus} from './utils/enqueueFocus';
import {contains} from './utils/contains';

const VisuallyHiddenDismiss = React.forwardRef(function VisuallyHiddenDismiss(
  props: React.ButtonHTMLAttributes<HTMLButtonElement>,
  ref: React.Ref<HTMLButtonElement>
) {
  return <button {...props} ref={ref} tabIndex={-1} style={HIDDEN_STYLES} />;
});

export interface Props<RT extends ReferenceType = ReferenceType> {
  context: FloatingContext<RT>;
  children: JSX.Element;
  order?: Array<'reference' | 'floating' | 'content'>;
  initialFocus?: number | React.MutableRefObject<HTMLElement | null>;
  guards?: boolean;
  returnFocus?: boolean;
  modal?: boolean;
  visuallyHiddenDismiss?: boolean | string;
}

/**
 * Provides focus management for the floating element.
 * @see https://floating-ui.com/docs/FloatingFocusManager
 */
export function FloatingFocusManager<RT extends ReferenceType = ReferenceType>({
  context,
  children,
  order = ['content'],
  guards = true,
  initialFocus = 0,
  returnFocus = true,
  modal = true,
  visuallyHiddenDismiss = false,
}: Props<RT>): JSX.Element {
  const {
    refs,
    nodeId,
    onOpenChange,
    events,
    _: {domReference},
  } = context;

  const orderRef = useLatestRef(order);
  const tree = useFloatingTree();
  const portalContext = usePortalContext();
  const [tabbableContentLength, setTabbableContentLength] = React.useState<
    number | null
  >(null);

  // Controlled by `useListNavigation`.
  const initialFocusControlled =
    typeof initialFocus === 'number' && initialFocus < 0;

  const startDismissButtonRef = React.useRef<HTMLButtonElement>(null);
  const endDismissButtonRef = React.useRef<HTMLButtonElement>(null);
  const preventReturnFocusRef = React.useRef(false);
  const previouslyFocusedElementRef = React.useRef<Element | null>(null);
  const insidePortal = portalContext != null;

  // If the reference is a combobox and is typeable (e.g. input/textarea),
  // there are different focus semantics. The guards should not be rendered, but
  // aria-hidden should be applied to all nodes still. Further, the visually
  // hidden dismiss button should only appear at the end of the list, not the
  // start.
  const typeableCombobox =
    domReference &&
    domReference.getAttribute('role') === 'combobox' &&
    isTypeableElement(domReference);

  const getTabbableContent = React.useCallback(
    (container: HTMLElement | null = refs.floating.current) => {
      return container ? tabbable(container, getTabbableOptions()) : [];
    },
    [refs]
  );

  const getFocusableContent = React.useCallback(
    (container: HTMLElement | null = refs.floating.current) => {
      return container ? focusable(container, getTabbableOptions()) : [];
    },
    [refs]
  );

  const getTabbableElements = React.useCallback(
    (container?: HTMLElement, allFocusable?: boolean) => {
      const content = allFocusable
        ? getFocusableContent(container)
        : getTabbableContent(container);

      return orderRef.current
        .map((type) => {
          if (refs.domReference.current && type === 'reference') {
            return refs.domReference.current;
          }

          if (refs.floating.current && type === 'floating') {
            return refs.floating.current;
          }

          return content;
        })
        .filter(Boolean)
        .flat() as Array<FocusableElement>;
    },
    [orderRef, refs, getTabbableContent, getFocusableContent]
  );

  React.useEffect(() => {
    if (!modal) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Tab') {
        // The focus guards have nothing to focus, so we need to stop the event.
        if (getTabbableContent().length === 0) {
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
            enqueueFocus(els[els.length - 1]);
          } else {
            enqueueFocus(els[1]);
          }
        }

        if (
          orderRef.current[1] === 'floating' &&
          target === refs.floating.current &&
          event.shiftKey
        ) {
          stopEvent(event);
          enqueueFocus(els[0]);
        }
      }
    }

    const doc = getDocument(refs.floating.current);
    doc.addEventListener('keydown', onKeyDown);
    return () => {
      doc.removeEventListener('keydown', onKeyDown);
    };
  }, [modal, orderRef, refs, getTabbableContent, getTabbableElements]);

  React.useEffect(() => {
    const floating = refs.floating.current;
    const reference = refs.domReference.current;

    // Don't hide portals nested within the parent portal.
    const portalNodes = Array.from(
      portalContext?.portalNode?.querySelectorAll(
        '[data-floating-ui-portal]'
      ) ?? []
    );

    function getGuards() {
      return (
        portalContext
          ? [
              portalContext.afterInsideRef.current,
              portalContext.beforeInsideRef.current,
              portalContext.afterOutsideRef.current,
              portalContext.beforeOutsideRef.current,
            ]
          : []
      ).filter(Boolean) as Array<Element>;
    }

    function getDismissButtons() {
      return [
        startDismissButtonRef.current,
        endDismissButtonRef.current,
      ].filter(Boolean) as Array<Element>;
    }

    let isPointerDown = false;

    // In Safari, buttons lose focus when pressing them.
    function handlePointerDown() {
      isPointerDown = true;
      setTimeout(() => {
        isPointerDown = false;
      });
    }

    function handleFocusInside(event: FocusEvent) {
      const relatedTarget = event.relatedTarget as Element | null;
      const node =
        tree &&
        [
          tree.nodesRef.current.find((node) => node.id === nodeId),
          ...getChildren(tree.nodesRef.current, nodeId),
        ].find((node) =>
          contains(node?.context?.refs.floating.current, relatedTarget)
        );

      const didHitGuard = getGuards().includes(relatedTarget as HTMLElement);

      if (!modal && didHitGuard) {
        onOpenChange(false);
      } else if (node && node.context && initialFocusControlled) {
        node.context.onOpenChange(false);
      }
    }

    function handleFocusOutside(event: FocusEvent) {
      const relatedTarget = event.relatedTarget as Element | null;
      const movedToUnrelatedNode = !(
        contains(reference, relatedTarget) ||
        contains(floating, relatedTarget) ||
        getGuards().includes(relatedTarget as Element) ||
        getDismissButtons().includes(relatedTarget as Element) ||
        (tree &&
          getChildren(tree.nodesRef.current, nodeId).find(
            (node) =>
              contains(node.context?.refs.floating.current, relatedTarget) ||
              contains(node.context?.refs.domReference.current, relatedTarget)
          ))
      );

      // Focus did not move inside the floating tree, and there are no tabbable
      // portal guards to handle closing.
      if (
        relatedTarget &&
        movedToUnrelatedNode &&
        !isPointerDown &&
        // Fix React 18 Strict Mode returnFocus due to double rendering.
        relatedTarget !== previouslyFocusedElementRef.current
      ) {
        preventReturnFocusRef.current = true;
        onOpenChange(false);
      }
    }

    if (floating && isHTMLElement(reference)) {
      let cleanup: () => void;
      if (modal) {
        const insideNodes = [floating, ...portalNodes, ...getDismissButtons()];
        cleanup = hideOthers(
          orderRef.current.includes('reference')
            ? insideNodes.concat(reference)
            : insideNodes
        );
      }

      reference.addEventListener('focus', handleFocusInside);
      !modal && floating.addEventListener('focusout', handleFocusOutside);

      const addReferenceListeners =
        (!modal || typeableCombobox) && (!portalContext || typeableCombobox);

      if (addReferenceListeners) {
        reference.addEventListener('focusout', handleFocusOutside);
        reference.addEventListener('pointerdown', handlePointerDown);
      }

      return () => {
        reference.removeEventListener('focus', handleFocusInside);
        !modal && floating.removeEventListener('focusout', handleFocusOutside);

        if (addReferenceListeners) {
          reference.removeEventListener('focusout', handleFocusOutside);
          reference.removeEventListener('pointerdown', handlePointerDown);
        }

        cleanup?.();
      };
    }
  }, [
    modal,
    initialFocus,
    nodeId,
    tree,
    orderRef,
    refs,
    portalContext,
    typeableCombobox,
    initialFocusControlled,
    onOpenChange,
  ]);

  React.useEffect(() => {
    const floating = refs.floating.current;

    if (modal && !guards && floating) {
      const tabIndexValues: Array<string | null> = [];
      const options = getTabbableOptions();
      const allTabbable = tabbable(getDocument(floating).body, options);
      const floatingTabbable = getTabbableElements();

      // Exclude all tabbable elements that are part of the order
      const elements = allTabbable.filter(
        (el) => !floatingTabbable.includes(el)
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
  }, [modal, guards, refs, getTabbableElements]);

  // Layout effect to ensure that the previouslyFocusedElement is set before
  // focus is moved inside the floating element via hooks like
  // useListNavigation.
  useLayoutEffect(() => {
    const floating = refs.floating.current;
    if (!floating) {
      return;
    }

    const doc = getDocument(floating);

    let returnFocusValue = returnFocus;
    let preventReturnFocusScroll = false;
    const previouslyFocusedElement =
      refs.domReference.current ?? activeElement(doc);

    previouslyFocusedElementRef.current = previouslyFocusedElement;

    const focusableElements = getTabbableElements(floating, true);
    const elToFocus =
      typeof initialFocus === 'number'
        ? focusableElements[initialFocus]
        : initialFocus.current;

    // If the `useListNavigation` hook is active, always ignore `initialFocus`
    // because it has its own handling of the initial focus.
    !initialFocusControlled && enqueueFocus(elToFocus, elToFocus === floating);

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
        !preventReturnFocusRef.current
      ) {
        enqueueFocus(previouslyFocusedElement, preventReturnFocusScroll);
      }
    };
  }, [
    getTabbableElements,
    initialFocus,
    returnFocus,
    refs,
    events,
    initialFocusControlled,
  ]);

  // Synchronize the `modal` value to the FloatingPortal context. It will
  // decide whether or not it needs to render its own guards.
  useLayoutEffect(() => {
    portalContext?.setModal(modal);
  }, [portalContext, modal]);

  useLayoutEffect(() => {
    if (getFocusableContent().length === 0 && !initialFocusControlled) {
      setTabbableContentLength(0);
    }
  }, [getFocusableContent, refs, initialFocusControlled]);

  // Let the FloatingPortal's guards close the floating element.
  React.useImperativeHandle(
    portalContext?.contextRef,
    () => context as unknown as FloatingContext
  );

  const shouldRenderGuards =
    guards && (insidePortal || modal) && !typeableCombobox;

  function renderDismissButton(location: 'start' | 'end') {
    return visuallyHiddenDismiss && modal ? (
      <VisuallyHiddenDismiss
        ref={location === 'start' ? startDismissButtonRef : endDismissButtonRef}
        onClick={() => onOpenChange(false)}
      >
        {typeof visuallyHiddenDismiss === 'string'
          ? visuallyHiddenDismiss
          : 'Dismiss'}
      </VisuallyHiddenDismiss>
    ) : null;
  }

  return (
    <>
      {shouldRenderGuards && (
        <FocusGuard
          ref={portalContext?.beforeInsideRef}
          onFocus={(event) => {
            if (modal) {
              const els = getTabbableElements();
              enqueueFocus(
                order[0] === 'reference' ? els[0] : els[els.length - 1]
              );
            } else if (
              portalContext?.preserveTabOrder &&
              portalContext.portalNode
            ) {
              preventReturnFocusRef.current = false;
              if (isOutsideEvent(event, portalContext.portalNode)) {
                const nextTabbable = getNextTabbable() || domReference;
                nextTabbable?.focus();
              } else {
                portalContext.beforeOutsideRef.current?.focus();
              }
            }
          }}
        />
      )}
      {/* 
        Ensure the first swipe is the list item. The end of the listbox popup
        will have a dismiss button. 
      */}
      {typeableCombobox ? null : renderDismissButton('start')}
      {React.cloneElement(
        children,
        tabbableContentLength === 0 || order.includes('floating')
          ? {tabIndex: 0}
          : {}
      )}
      {renderDismissButton('end')}
      {shouldRenderGuards && (
        <FocusGuard
          ref={portalContext?.afterInsideRef}
          onFocus={(event) => {
            if (modal) {
              enqueueFocus(getTabbableElements()[0]);
            } else if (
              portalContext?.preserveTabOrder &&
              portalContext.portalNode
            ) {
              preventReturnFocusRef.current = true;
              if (isOutsideEvent(event, portalContext.portalNode)) {
                const prevTabbable = getPreviousTabbable() || domReference;
                prevTabbable?.focus();
              } else {
                portalContext.afterOutsideRef.current?.focus();
              }
            }
          }}
        />
      )}
    </>
  );
}
