import type {Rect, Side} from '@floating-ui/core';

import type {HandleCloseFn} from './hooks/useHover';
import type {ReferenceType} from './types';
import {contains} from './utils/contains';
import {getChildren} from './utils/getChildren';
import {getTarget} from './utils/getTarget';
import {isElement} from './utils/is';

type Point = [number, number];
type Polygon = Point[];

function isPointInPolygon(point: Point, polygon: Polygon) {
  const [x, y] = point;
  let isInside = false;
  const length = polygon.length;
  for (let i = 0, j = length - 1; i < length; j = i++) {
    const [xi, yi] = polygon[i] || [0, 0];
    const [xj, yj] = polygon[j] || [0, 0];
    const intersect =
      yi >= y !== yj >= y && x <= ((xj - xi) * (y - yi)) / (yj - yi) + xi;
    if (intersect) {
      isInside = !isInside;
    }
  }
  return isInside;
}

function isInside(point: Point, rect: Rect) {
  return (
    point[0] >= rect.x &&
    point[0] <= rect.x + rect.width &&
    point[1] >= rect.y &&
    point[1] <= rect.y + rect.height
  );
}

export function safePolygon<RT extends ReferenceType = ReferenceType>({
  restMs = 0,
  buffer = 0.5,
  blockPointerEvents = false,
}: Partial<{
  restMs: number;
  buffer: number;
  blockPointerEvents: boolean;
}> = {}) {
  let timeoutId: NodeJS.Timeout;
  let isInsideRect = false;
  let hasLanded = false;

  const fn: HandleCloseFn<RT> = ({
    x,
    y,
    placement,
    elements,
    onClose,
    nodeId,
    tree,
  }) => {
    return function onMouseMove(event: MouseEvent) {
      function close() {
        clearTimeout(timeoutId);
        onClose();
      }

      clearTimeout(timeoutId);

      if (
        !elements.domReference ||
        !elements.floating ||
        placement == null ||
        x == null ||
        y == null
      ) {
        return;
      }

      const {clientX, clientY} = event;
      const clientPoint: Point = [clientX, clientY];
      const target = getTarget(event) as Element | null;
      const isLeave = event.type === 'mouseleave';
      const isOverFloatingEl = contains(elements.floating, target);
      const isOverReferenceEl = contains(elements.domReference, target);
      const refRect = elements.domReference.getBoundingClientRect();
      const rect = elements.floating.getBoundingClientRect();
      const side = placement.split('-')[0] as Side;
      const cursorLeaveFromRight = x > rect.right - rect.width / 2;
      const cursorLeaveFromBottom = y > rect.bottom - rect.height / 2;
      const isOverReferenceRect = isInside(clientPoint, refRect);

      if (isOverFloatingEl) {
        hasLanded = true;
      }

      if (isOverReferenceEl) {
        hasLanded = false;
      }

      if (isOverReferenceEl && !isLeave) {
        hasLanded = true;
        return;
      }

      // Prevent overlapping floating element from being stuck in an open-close
      // loop: https://github.com/floating-ui/floating-ui/issues/1910
      if (
        isLeave &&
        isElement(event.relatedTarget) &&
        contains(elements.floating, event.relatedTarget)
      ) {
        return;
      }

      // If any nested child is open, abort.
      if (
        tree &&
        getChildren(tree.nodesRef.current, nodeId).some(
          ({context}) => context?.open
        )
      ) {
        return;
      }

      // If the pointer is leaving from the opposite side, the "buffer" logic
      // creates a point where the floating element remains open, but should be
      // ignored.
      // A constant of 1 handles floating point rounding errors.
      if (
        (side === 'top' && y >= refRect.bottom - 1) ||
        (side === 'bottom' && y <= refRect.top + 1) ||
        (side === 'left' && x >= refRect.right - 1) ||
        (side === 'right' && x <= refRect.left + 1)
      ) {
        return close();
      }

      // Ignore when the cursor is within the rectangular trough between the
      // two elements. Since the triangle is created from the cursor point,
      // which can start beyond the ref element's edge, traversing back and
      // forth from the ref to the floating element can cause it to close. This
      // ensures it always remains open in that case.
      let rectPoly: Point[] = [];

      switch (side) {
        case 'top':
          rectPoly = [
            [rect.left, refRect.top + 1],
            [rect.left, rect.bottom - 1],
            [rect.right, rect.bottom - 1],
            [rect.right, refRect.top + 1],
          ];
          isInsideRect =
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= refRect.top + 1;
          break;
        case 'bottom':
          rectPoly = [
            [rect.left, rect.top + 1],
            [rect.left, refRect.bottom - 1],
            [rect.right, refRect.bottom - 1],
            [rect.right, rect.top + 1],
          ];
          isInsideRect =
            clientX >= rect.left &&
            clientX <= rect.right &&
            clientY >= refRect.bottom - 1 &&
            clientY <= rect.bottom;
          break;
        case 'left':
          rectPoly = [
            [rect.right - 1, rect.bottom],
            [rect.right - 1, rect.top],
            [refRect.left + 1, rect.top],
            [refRect.left + 1, rect.bottom],
          ];
          isInsideRect =
            clientX >= rect.left &&
            clientX <= refRect.left + 1 &&
            clientY >= rect.top &&
            clientY <= rect.bottom;
          break;
        case 'right':
          rectPoly = [
            [refRect.right - 1, rect.bottom],
            [refRect.right - 1, rect.top],
            [rect.left + 1, rect.top],
            [rect.left + 1, rect.bottom],
          ];
          isInsideRect =
            clientX >= refRect.right - 1 &&
            clientX <= rect.right &&
            clientY >= rect.top &&
            clientY <= rect.bottom;
          break;
      }

      function getPolygon([x, y]: Point): Array<Point> {
        const isFloatingWider = rect.width > refRect.width;
        const isFloatingTaller = rect.height > refRect.height;

        switch (side) {
          case 'top': {
            const cursorPointOne: Point = [
              isFloatingWider
                ? x + buffer / 2
                : cursorLeaveFromRight
                ? x + buffer * 4
                : x - buffer * 4,
              y + buffer + 1,
            ];
            const cursorPointTwo: Point = [
              isFloatingWider
                ? x - buffer / 2
                : cursorLeaveFromRight
                ? x + buffer * 4
                : x - buffer * 4,
              y + buffer + 1,
            ];
            const commonPoints: [Point, Point] = [
              [
                rect.left,
                cursorLeaveFromRight
                  ? rect.bottom - buffer
                  : isFloatingWider
                  ? rect.bottom - buffer
                  : rect.top,
              ],
              [
                rect.right,
                cursorLeaveFromRight
                  ? isFloatingWider
                    ? rect.bottom - buffer
                    : rect.top
                  : rect.bottom - buffer,
              ],
            ];

            return [cursorPointOne, cursorPointTwo, ...commonPoints];
          }
          case 'bottom': {
            const cursorPointOne: Point = [
              isFloatingWider
                ? x + buffer / 2
                : cursorLeaveFromRight
                ? x + buffer * 4
                : x - buffer * 4,
              y - buffer,
            ];
            const cursorPointTwo: Point = [
              isFloatingWider
                ? x - buffer / 2
                : cursorLeaveFromRight
                ? x + buffer * 4
                : x - buffer * 4,
              y - buffer,
            ];
            const commonPoints: [Point, Point] = [
              [
                rect.left,
                cursorLeaveFromRight
                  ? rect.top + buffer
                  : isFloatingWider
                  ? rect.top + buffer
                  : rect.bottom,
              ],
              [
                rect.right,
                cursorLeaveFromRight
                  ? isFloatingWider
                    ? rect.top + buffer
                    : rect.bottom
                  : rect.top + buffer,
              ],
            ];

            return [cursorPointOne, cursorPointTwo, ...commonPoints];
          }
          case 'left': {
            const cursorPointOne: Point = [
              x + buffer + 1,
              isFloatingTaller
                ? y + buffer / 2
                : cursorLeaveFromBottom
                ? y + buffer * 4
                : y - buffer * 4,
            ];
            const cursorPointTwo: Point = [
              x + buffer + 1,
              isFloatingTaller
                ? y - buffer / 2
                : cursorLeaveFromBottom
                ? y + buffer * 4
                : y - buffer * 4,
            ];
            const commonPoints: [Point, Point] = [
              [
                cursorLeaveFromBottom
                  ? rect.right - buffer
                  : isFloatingTaller
                  ? rect.right - buffer
                  : rect.left,
                rect.top,
              ],
              [
                cursorLeaveFromBottom
                  ? isFloatingTaller
                    ? rect.right - buffer
                    : rect.left
                  : rect.right - buffer,
                rect.bottom,
              ],
            ];

            return [...commonPoints, cursorPointOne, cursorPointTwo];
          }
          case 'right': {
            const cursorPointOne: Point = [
              x - buffer,
              isFloatingTaller
                ? y + buffer / 2
                : cursorLeaveFromBottom
                ? y + buffer * 4
                : y - buffer * 4,
            ];
            const cursorPointTwo: Point = [
              x - buffer,
              isFloatingTaller
                ? y - buffer / 2
                : cursorLeaveFromBottom
                ? y + buffer * 4
                : y - buffer * 4,
            ];
            const commonPoints: [Point, Point] = [
              [
                cursorLeaveFromBottom
                  ? rect.left + buffer
                  : isFloatingTaller
                  ? rect.left + buffer
                  : rect.right,
                rect.top,
              ],
              [
                cursorLeaveFromBottom
                  ? isFloatingTaller
                    ? rect.left + buffer
                    : rect.right
                  : rect.left + buffer,
                rect.bottom,
              ],
            ];

            return [cursorPointOne, cursorPointTwo, ...commonPoints];
          }
        }
      }

      const poly = isInsideRect ? rectPoly : getPolygon([x, y]);

      if (isInsideRect) {
        return;
      } else if (hasLanded && !isOverReferenceRect) {
        return close();
      }

      if (!isPointInPolygon([clientX, clientY], poly)) {
        close();
      } else if (restMs && !hasLanded) {
        timeoutId = setTimeout(close, restMs);
      }
    };
  };

  fn.__options = {
    blockPointerEvents,
  };

  return fn;
}
