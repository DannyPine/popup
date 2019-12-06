// @flow
import type { Placement, ModifierPhases } from './enums';
export type JQueryWrapper = { @@iterator: HTMLElement[], jquery: string };

export type Rect = {|
  width: number,
  height: number,
  x: number,
  y: number,
|};

export type Offsets = {|
  y: number,
  x: number,
|};

export type PositioningStrategy = 'absolute' | 'fixed';

export type StateMeasures = {|
  reference: Rect,
  popper: Rect,
|};

export type StateOffsets = {|
  popper: Offsets,
  arrow?: Offsets,
|};

export type State = {|
  elements: {|
    reference: Element | VirtualElement,
    popper: HTMLElement,
    arrow?: HTMLElement,
  |},
  placementMeasures: {|
    top: ClientRectObject,
    right: ClientRectObject,
    bottom: ClientRectObject,
    left: ClientRectObject,
  |},
  options: Options,
  placement: Placement,
  domPlacement: Placement,
  strategy: PositioningStrategy,
  orderedModifiers: Array<Modifier<any>>,
  measures: StateMeasures,
  scrollParents: {|
    reference: Array<Element>,
    popper: Array<Element>,
  |},
  styles: {|
    [key: string]: $Shape<CSSStyleDeclaration>,
  |},
  attributes: {|
    [key: string]: {| [key: string]: string |},
  |},
  modifiersData: { [key: string]: any },
  reset: boolean,
|};

export type Instance = {|
  destroy: () => void,
  forceUpdate: () => void,
  update: () => Promise<void>,
  setOptions: (options: $Shape<Options>) => void,
|};

export type ModifierArguments<Options> = {
  state: State,
  instance: Instance,
  options?: Options,
  name: string,
};
export type Modifier<Options> = {|
  name: string,
  enabled: boolean,
  phase: ModifierPhases,
  requires?: Array<string>,
  fn: (ModifierArguments<Options>) => State,
  onLoad?: (ModifierArguments<Options>) => ?State,
  onDestroy?: (ModifierArguments<Options>) => void,
  options?: any,
  data?: {},
|};

export type EventListeners = {| scroll: boolean, resize: boolean |};

export type Options = {|
  placement: Placement,
  modifiers: Array<Modifier<any>>,
  strategy: PositioningStrategy,
  eventListeners: boolean | {| scroll?: boolean, resize?: boolean |},
|};

export type UpdateCallback = State => void;

export type ClientRectObject = {|
  x: number,
  y: number,
  top: number,
  left: number,
  right: number,
  bottom: number,
  width: number,
  height: number,
|};

export type PaddingObject = {|
  top: number,
  left: number,
  right: number,
  bottom: number,
|};

export type Padding = number | $Shape<PaddingObject>;

export type VirtualElement = {|
  contextElement: HTMLElement,
  getBoundingClientRect: () => ClientRect | DOMRect,
|};
