import modifiers from '../modifiers/index';

/**
 * Default options provided to Popper.js constructor.
 * These can be overriden using the `options` argument of Popper.js.
 * To override an option, simply pass as 3rd argument an object with the same
 * structure of {defaults}, example:
 * ```
 * new Popper(ref, pop, {
 *   modifiers: {
 *     preventOverflow: { enabled: false }
 *   }
 * })
 * ```
 * @type {Object}
 * @static
 * @memberof Popper
 */
export default {
  /**
   * Popper's placement
   * @prop {String} placement='bottom'
   */
  placement: 'bottom',

  /**
   * Whether events (resize, scroll) are initially enabled
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: true,

  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: false,

  /**
   * Callback called when the popper is created.
   * By default, is set to no-op.
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreateCallback}
   */
  onCreate: () => {},

  /**
   * Callback called when the popper is updated, this callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.
   * By default, is set to no-op.
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdateCallback}
   */
  onUpdate: () => {},

  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js
   * @prop {modifiers}
   */
  modifiers,
};

/**
 * @callback onCreateCallback
 * @param {dataObject} data
 */

/**
 * @callback onUpdateCallback
 * @param {dataObject} data
 */
