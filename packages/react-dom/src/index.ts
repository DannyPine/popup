import type {
  ComputePositionConfig,
  ComputePositionReturn,
  Middleware,
  SideObject,
  VirtualElement,
} from '@floating-ui/core';
import {computePosition, arrow as arrowCore} from '@floating-ui/dom';
import {useCallback, useMemo, useState, useRef, MutableRefObject} from 'react';
import {flushSync} from 'react-dom';
import useLayoutEffect from 'use-isomorphic-layout-effect';
import {deepEqual} from './utils/deepEqual';

export * from '@floating-ui/dom';

type Data = Omit<ComputePositionReturn, 'x' | 'y'> & {
  x: number | null;
  y: number | null;
};

type ReferenceType = Element | VirtualElement;

export type UseFloatingReturn<RT extends ReferenceType = ReferenceType> =
  Data & {
    update: () => void;
    reference: (node: RT | null) => void;
    floating: (node: HTMLElement | null) => void;
    refs: {
      reference: MutableRefObject<RT | null>;
      floating: MutableRefObject<HTMLElement | null>;
    };
  };

export function useFloating<RT extends ReferenceType = ReferenceType>({
  middleware,
  placement = 'bottom',
  strategy = 'absolute',
}: Omit<
  Partial<ComputePositionConfig>,
  'platform'
> = {}): UseFloatingReturn<RT> {
  const reference = useRef<RT | null>(null);
  const floating = useRef<HTMLElement | null>(null);
  const [data, setData] = useState<Data>({
    // Setting these to `null` will allow the consumer to determine if
    // `computePosition()` has run yet
    x: null,
    y: null,
    strategy,
    placement,
    middlewareData: {},
  });

  const [latestMiddleware, setLatestMiddleware] = useState(middleware);

  if (
    !deepEqual(
      latestMiddleware?.map(({options}) => options),
      middleware?.map(({options}) => options)
    )
  ) {
    setLatestMiddleware(middleware);
  }

  const isMountedRef = useRef(true);
  useLayoutEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const update = useCallback(() => {
    if (!reference.current || !floating.current) {
      return;
    }

    computePosition(reference.current, floating.current, {
      middleware: latestMiddleware,
      placement,
      strategy,
    }).then((data) => {
      if (isMountedRef.current) {
        flushSync(() => {
          setData(data);
        });
      }
    });
  }, [latestMiddleware, placement, strategy]);

  useLayoutEffect(update, [update]);

  const setReference: UseFloatingReturn<RT>['reference'] = useCallback(
    (node) => {
      reference.current = node;
      update();
    },
    [update]
  );

  const setFloating: UseFloatingReturn<RT>['floating'] = useCallback(
    (node) => {
      floating.current = node;
      update();
    },
    [update]
  );

  const refs = useMemo(() => ({reference, floating}), []);

  return useMemo(
    () => ({
      ...data,
      update,
      refs,
      reference: setReference,
      floating: setFloating,
    }),
    [data, update, refs, setReference, setFloating]
  );
}

export const arrow = (options: {
  element: MutableRefObject<HTMLElement | null> | HTMLElement;
  padding?: number | SideObject;
}): Middleware => {
  const {element, padding} = options;

  function isRef(value: unknown): value is MutableRefObject<unknown> {
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
