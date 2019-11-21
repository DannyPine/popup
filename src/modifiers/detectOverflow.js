// @flow
import type { State, Modifier } from '../types';
import getBoundingClientRect from '../dom-utils/getBoundingClientRect';
import computeOffsets from '../utils/computeOffsets';

type Options = {
  boundaryElement: HTMLElement,
};

type ModifierData = {
  top: boolean,
  bottom: boolean,
  right: boolean,
  left: boolean,
};

export function detectOverflow(
  state: State,
  options: Options = {
    boundaryElement: state.elements.popper.ownerDocument.body,
  }
) {
  const popperElement = state.elements.popper;
  const referenceElement = state.elements.reference;
  const popperRect = state.measures.popper;

  if (!options.boundaryElement.contains(popperElement)) {
    console.error(
      'PopperJS: "detectOverflow" can accept as `boundaryElement` only a parent node of the provided popper.'
    );
    return state;
  }

  const boundaryClientRect = getBoundingClientRect(options.boundaryElement);
  const referenceClientRect = getBoundingClientRect(referenceElement);

  const popperOffsets = computeOffsets({
    reference: referenceClientRect,
    element: popperRect,
    strategy: 'absolute',
    placement: state.options.placement,
    scroll: {
      scrollTop: 0,
      scrollLeft: 0,
    },
  });

  const popperClientRect = {
    ...popperOffsets,
    top: popperOffsets.y,
    bottom: popperOffsets.y + popperRect.height,
    left: popperOffsets.x,
    right: popperOffsets.x + popperRect.width,
  };

  state.modifiersData.detectOverflow = {
    top: boundaryClientRect.top > popperClientRect.top,
    bottom: boundaryClientRect.bottom < popperClientRect.bottom,
    left: boundaryClientRect.left > popperClientRect.left,
    right: boundaryClientRect.right < popperClientRect.right,
  };

  console.log(boundaryClientRect, popperClientRect);
  console.log(state.modifiersData.detectOverflow);

  return state;
}

export default ({
  name: 'detectOverflow',
  enabled: true,
  phase: 'read',
  fn: detectOverflow,
  data: {},
}: Modifier);
