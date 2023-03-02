import * as React from 'react';

import {platform} from '..';
import type {Alignment, FloatingContext, Side} from '../types';

export interface Props extends React.SVGAttributes<SVGSVGElement> {
  context: FloatingContext;

  /**
   * Width of the arrow.
   * @default 14
   */
  width?: number;

  /**
   * Height of the arrow.
   * @default 7
   */
  height?: number;

  /**
   * The corner radius (rounding) of the arrow tip.
   * @default 0 (sharp)
   */
  tipRadius?: number;

  /**
   * Forces a static offset over dynamic positioning under a certain condition.
   */
  staticOffset?: string | number | null;

  /**
   * Custom path string.
   */
  d?: string;

  /**
   * Stroke (border) color of the arrow.
   */
  stroke?: string;

  /**
   * Stroke (border) width of the arrow.
   */
  strokeWidth?: number;
}

/**
 * Renders a pointing arrow triangle.
 * @see https://floating-ui.com/docs/FloatingArrow
 */
export const FloatingArrow = React.forwardRef(function FloatingArrow(
  {
    context: {
      placement,
      elements: {floating},
      middlewareData: {arrow},
    },
    width = 14,
    height = 7,
    tipRadius = 0,
    strokeWidth = 0,
    staticOffset,
    stroke,
    d,
    ...rest
  }: Props,
  ref: React.Ref<SVGSVGElement>
): JSX.Element {
  if (__DEV__) {
    if (!ref) {
      console.warn(
        'Floating UI: The `ref` prop is required for the `FloatingArrow`',
        'component.'
      );
    }
  }

  const svgX = (width / 2) * (tipRadius / -8 + 1);
  const svgY = ((height / 2) * tipRadius) / 4;

  const [side, alignment] = placement.split('-') as [Side, Alignment];
  const isRTL = floating ? platform.isRTL(floating) : false;
  const isCustomShape = !!d;
  const isVerticalSide = side === 'top' || side === 'bottom';

  const yOffsetProp = staticOffset && alignment === 'end' ? 'bottom' : 'top';
  let xOffsetProp = staticOffset && alignment === 'end' ? 'right' : 'left';
  if (staticOffset && isRTL) {
    xOffsetProp = alignment === 'end' ? 'left' : 'right';
  }

  const arrowX = arrow?.x != null ? staticOffset || arrow.x : '';
  const arrowY = arrow?.y != null ? staticOffset || arrow.y : '';

  const dValue =
    d ||
    'M0,0' +
      ` H${width}` +
      ` L${width - svgX},${height - svgY}` +
      ` Q${width / 2},${height} ${svgX},${height - svgY}` +
      ' Z';

  const rotation = {
    top: isCustomShape ? 'rotate(180deg)' : '',
    left: isCustomShape ? 'rotate(90deg)' : 'rotate(-90deg)',
    bottom: isCustomShape ? '' : 'rotate(180deg)',
    right: isCustomShape ? 'rotate(-90deg)' : 'rotate(90deg)',
  }[side];

  return (
    <svg
      {...rest}
      // @ts-ignore
      suppressHydrationWarning
      aria-hidden
      ref={ref}
      width={isCustomShape ? width : width + (isVerticalSide ? strokeWidth : 0)}
      height={width}
      viewBox={
        isCustomShape
          ? `0 0 ${width} ${width}`
          : `0 0 ${width} ${width + (!isVerticalSide ? strokeWidth : 0)}`
      }
      style={{
        ...rest.style,
        position: 'absolute',
        pointerEvents: 'none',
        [xOffsetProp]: arrowX ?? '',
        [yOffsetProp]: arrowY ?? '',
        [side]: '100%',
        transform: `${rotation}${
          rest.style?.transform ? ` ${rest.style.transform}` : ''
        }`,
      }}
    >
      {strokeWidth > 0 && (
        <path
          fill="none"
          stroke={stroke}
          // Account for the stroke on the fill path rendered below.
          strokeWidth={strokeWidth + (d ? 0 : 1)}
          d={dValue}
        />
      )}
      {/* In Firefox, for left/right placements there's a ~0.5px gap where the
      border can show through. Adding a stroke on the fill removes it. */}
      <path stroke={strokeWidth && !d ? rest.fill : 'none'} d={dValue} />
    </svg>
  );
});
