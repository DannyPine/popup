import type {Middleware, SideObject} from '@floating-ui/core';
import {arrow as arrowCore} from '@floating-ui/dom';
import * as React from 'react';

export interface Options {
  element: React.MutableRefObject<Element | null> | Element;
  padding?: number | SideObject;
}

/**
 * A data provider that provides data to position an inner element of the
 * floating element (usually a triangle or caret) so that it is centered to the
 * reference element.
 * This wraps the core `arrow` middleware to allow React refs as the element.
 * @see https://floating-ui.com/docs/arrow
 */
export const arrow = (options: Options): Middleware => {
  const {element, padding} = options;

  function isRef(value: unknown): value is React.MutableRefObject<unknown> {
    return Object.prototype.hasOwnProperty.call(value, 'current');
  }

  return {
    name: 'arrow',
    options,
    fn(args) {
      if (isRef(element)) {
        if (element.current != null) {
          return arrowCore({element: element.current, padding}).fn(args);
        }

        return {};
      } else if (element) {
        return arrowCore({element, padding}).fn(args);
      }

      return {};
    },
  };
};
