import * as React from 'react';

import type {ElementProps, FloatingContext, ReferenceType} from '../types';
import {isHTMLElement, isMouseLikePointerType} from '../utils/is';
import {isTypeableElement} from '../utils/isTypeableElement';

function isButtonTarget(event: React.KeyboardEvent<Element>) {
  return isHTMLElement(event.target) && event.target.tagName === 'BUTTON';
}

function isSpaceIgnored(element: Element | null) {
  return isTypeableElement(element);
}

export interface Props {
  enabled?: boolean;
  event?: 'click' | 'mousedown';
  toggle?: boolean;
  ignoreMouse?: boolean;
  keyboardHandlers?: boolean;
}

/**
 * Opens or closes the floating element when clicking the reference element.
 * @see https://floating-ui.com/docs/useClick
 */
export const useClick = <RT extends ReferenceType = ReferenceType>(
  {open, onOpenChange, data, elements: {domReference}}: FloatingContext<RT>,
  {
    enabled = true,
    event: eventOption = 'click',
    toggle = true,
    ignoreMouse = false,
    keyboardHandlers = true,
  }: Props = {}
): ElementProps => {
  const pointerTypeRef = React.useRef<'mouse' | 'pen' | 'touch'>();

  return React.useMemo(() => {
    if (!enabled) {
      return {};
    }

    return {
      reference: {
        onPointerDown(event) {
          pointerTypeRef.current = event.pointerType;
        },
        onMouseDown(event) {
          // Ignore all buttons except for the "main" button.
          // https://developer.mozilla.org/en-US/docs/Web/API/MouseEvent/button
          if (event.button !== 0) {
            return;
          }

          if (
            isMouseLikePointerType(pointerTypeRef.current, true) &&
            ignoreMouse
          ) {
            return;
          }

          if (eventOption === 'click') {
            return;
          }

          if (open) {
            if (
              toggle &&
              (data.openEvent ? data.openEvent.type === 'mousedown' : true)
            ) {
              onOpenChange(false);
            }
          } else {
            // Prevent stealing focus from the floating element
            event.preventDefault();
            onOpenChange(true);
          }

          data.openEvent = event.nativeEvent;
        },
        onClick(event) {
          if (data.__syncReturnFocus) {
            return;
          }

          if (eventOption === 'mousedown' && pointerTypeRef.current) {
            pointerTypeRef.current = undefined;
            return;
          }

          if (
            isMouseLikePointerType(pointerTypeRef.current, true) &&
            ignoreMouse
          ) {
            return;
          }

          if (open) {
            if (
              toggle &&
              (data.openEvent ? data.openEvent.type === 'click' : true)
            ) {
              onOpenChange(false);
            }
          } else {
            onOpenChange(true);
          }

          data.openEvent = event.nativeEvent;
        },
        onKeyDown(event) {
          pointerTypeRef.current = undefined;

          if (!keyboardHandlers) {
            return;
          }

          if (isButtonTarget(event)) {
            return;
          }

          if (event.key === ' ' && !isSpaceIgnored(domReference)) {
            // Prevent scrolling
            event.preventDefault();
          }

          if (event.key === 'Enter') {
            if (open) {
              if (toggle) {
                onOpenChange(false);
              }
            } else {
              onOpenChange(true);
            }
          }
        },
        onKeyUp(event) {
          if (!keyboardHandlers) {
            return;
          }

          if (isButtonTarget(event) || isSpaceIgnored(domReference)) {
            return;
          }

          if (event.key === ' ') {
            if (open) {
              if (toggle) {
                onOpenChange(false);
              }
            } else {
              onOpenChange(true);
            }
          }
        },
      },
    };
  }, [
    enabled,
    data,
    eventOption,
    ignoreMouse,
    keyboardHandlers,
    domReference,
    toggle,
    open,
    onOpenChange,
  ]);
};
