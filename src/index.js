import detectIt from 'detect-it';
import { mouseEventsMap, touchEventsMap } from './eventMaps';
import hasPassive from './detectPassiveSupport';

/**
 * TouchState() constructor keeps track of the touch state for a target:
 * time of the last touchstart, the time of the last touchend,
 * and if the target is touched now, i.e. in touch active state
 *
 * @param {EventTarget}  target
 * @return {TouchState}
 */
function TouchState(target) {
  this.start = undefined;
  this.end = undefined;
  this.active = false;
  const options = hasPassive ? { passive: true, capture: true } : true;
  target.addEventListener('touchstart', () => { this.start = new Date(); this.active = true; }, options);
  target.addEventListener('touchend', () => { this.end = new Date(); this.active = false; }, options);
  target.addEventListener('touchcancel', () => { this.end = new Date(); this.active = false; }, options);
}

/**
 * TouchStartState() constructor keeps track of only the touch start state for a target,
 * the time of the last touchstart - this is used instead of TouchState when handling click
 * events on a touchOnly device because no need to also track touchend time and touch active state
 *
 * @param {EventTarget}  target
 * @return {TouchStartState}
 */
function TouchStartState(target) {
  this.start = undefined;
  const options = hasPassive ? { passive: true, capture: true } : true;
  target.addEventListener('touchstart', () => { this.start = new Date(); }, options);
}

/**
 * setTouchListener() sets a single touch listener for a specific target and event
 *
 * @param {Object}
 *   @param {EventTarget} target
 *   @param {String} event
 *   @param {Function} handler
 *   @param {Object or Boolean} listenerOptions
 *   @param {TouchState} touchState (optional)
 */
function setTouchListener({ target, event, handler, listenerOptions, touchState }) {
  // if the event is a known touch event, then set event listener
  if (touchEventsMap[event]) target.addEventListener(event, handler, listenerOptions);

  // if the event is a click event, then call the handler on touchend if within 500ms of touchstart
  else if (event === 'click') {
    // if no touchState, then create a new TouchStartState to keep track last touchstart time for 500ms click cutoff
    const touch = touchState || new TouchStartState(target);
    target.addEventListener('touchend', e => { if (new Date() - touch.start < 500) handler(e); }, listenerOptions);
  }
}

/**
 * setMouseListener() sets a single mouse listener for a specific target and event
 * note, this is called for mouseOnly devices - mouse event listeners for hybrid devices are set elsewhere
 *
 * @param {Object}
 *   @param {EventTarget} target
 *   @param {String} event
 *   @param {Function} handler
 *   @param {Object or Boolean} listenerOptions
 */
function setMouseListener({ target, event, handler, listenerOptions }) {
  // if the event is a known mouse event, then set the listener
  if (mouseEventsMap[event]) target.addEventListener(event, handler, listenerOptions);
}

/**
 * setHybridListener() sets mouse and touch listeners for a specific target and event
 *
 * @param {Object}
 *   @param {EventTarget} target
 *   @param {String} event
 *   @param {Function} handler
 *   @param {Object or Boolean} listenerOptions
 *   @param {TouchState} touchState
 */
function setHybridListener({ target, event, handler, listenerOptions, touchState }) {
  // set touch listener
  setTouchListener({ target, event, handler, listenerOptions, touchState });

  // if the event is a known mouse event, then set the listener
  if (mouseEventsMap[event]) {
    target.addEventListener(
      /**
       * Only call the handler if not in touch active state and the event occurred after 600ms
       * from the last touchend event to prevent calling mouse handlers as a result of touch interactions.
       * Based on testing, 600ms seems like sufficient time for all mouse events to fire after
       * the last touchend event. Also, on some devices (notably Android) during a long press the mouse
       * events will fire before touchend while actively touching the screen, so also need
       * to makes sure not in the touch active state.
       */
      event, e => { if (!touchState.active && new Date() - touchState.end > 600) handler(e); }, listenerOptions
    );
  }
}

/**
 * setPointerListener() sets a single pointer listener for a specific target and event
 *
 * @param {Object}
 *   @param {EventTarget} target
 *   @param {String} event
 *   @param {Function} handler
 *   @param {Object or Boolean} listenerOptions
 *   @param {Object} pointerOptions
 */
function setPointerListener({ target, event, handler, listenerOptions, pointerOptions }) {
  /**
   * look up the pointer event that corresponds to the event argument (which is a mouse or touch event),
   * note that at least one of ptrTouchEvent and ptrMouseEvent will be undefined
   */
  const ptrTouchEvent = touchEventsMap[event];
  const ptrMouseEvent = mouseEventsMap[event];

  // early return w/o setting a listener if pointerOptions says don't set listener for this specific pointer event
  if (pointerOptions && (pointerOptions[ptrTouchEvent] === false || pointerOptions[ptrMouseEvent] === false)) return;

  /**
   * pointerType() returns the input type that created the event (mouse or touch),
   * note that a pen pointer will be mapped to a touch input type
   *
   * @param {Event} e
   * @return {String} 'mouse' or 'touch'
   */
  function pointerType(e) {
    if (['touch', 2, 'pen', 3].indexOf(e.pointerType) !== -1) return 'touch';
    if (['mouse', 4].indexOf(e.pointerType) !== -1) return 'mouse';
    return undefined;
  }

  // access prefix function for pointer events
  const pfix = detectIt.pointerEventsPrefix;

  if (ptrMouseEvent === 'click' || ptrMouseEvent === 'dblclick') {
    // if the event is a click or double click event, then set event listener with handler
    target.addEventListener(ptrMouseEvent, handler, listenerOptions);
  } else if (ptrMouseEvent) {
    // if the event is a mouse event, then set pointer listener and only call the handler if pointType is a mouse
    target.addEventListener(pfix(ptrMouseEvent), e => { if (pointerType(e) === 'mouse') handler(e); }, listenerOptions);
  } else if (ptrTouchEvent) {
    // if the event is a touch event, then set pointer listener and only call handler if pointType is touch or pen
    target.addEventListener(pfix(ptrTouchEvent), e => { if (pointerType(e) === 'touch') handler(e); }, listenerOptions);
  }
}

/**
 * getListenerType() determines what function to use to set listeners based on the device type
 *
 * @return {Function} listener setter
 */
function getListenerType() {
  const dIt = detectIt;
  if (dIt.deviceType === 'mouseOnly') return setMouseListener;
  if (dIt.deviceType === 'touchOnly' && dIt.hasTouchEventsApi) return setTouchListener;
  if (dIt.deviceType === 'hybrid' && dIt.hasTouchEventsApi) return setHybridListener;
  if (dIt.hasTouch && dIt.hasPointerEventsApi) return setPointerListener;
  return function cantSetListeners() {};
}

/**
 * getListenerOptions() returns the options argument for target.addEventListener(eventType, handler, options)
 * based on if the browser supports passive event listeners - if the browser supports passive listeners
 * then options can be an object, otherwise it is a boolean indicating a capture phase listener
 *
 * @param {Boolean} passive
 * @param {Boolean} capture
 * @return {Object or Boolean} addEventListener options argument
 */
function getListenerOptions(passive, capture) {
  if (!passive || !hasPassive) return capture;
  return { capture, passive };
}

/**
 * parseKey() parses the key, which is a space separated string with events and options,
 * and returns an object with events in an array and listenerOptions as either
 * a boolean or an object (see getListenerOptions())
 *
 * @param {String} key, a space separated string containing events and options
 * @return {Object} events: array, listenerOptions: either boolean or object
 */
function parseKey(key) {
  const eventsAndOptions = key.split(' ');
  return {
    events: eventsAndOptions.filter(value => value !== 'passive' && value !== 'capture'),
    listenerOptions: getListenerOptions(
      eventsAndOptions.indexOf('passive') !== -1,
      eventsAndOptions.indexOf('capture') !== -1
    ),
  };
}

/**
 * addListener() is the control center for setting listeners
 *
 * @param {EventTarget} target (required)
 * @param {Object} eventsAndHandlers (required)
 * @param {Object} pointerOptions (optional)
 */
export default function addListener(target, eventsAndHandlers, pointerOptions) {
  // determine what function to use to set listeners based on type of device
  const setListener = getListenerType();

  // create new TouchState if need to keep track of touch state (only for hybrid devices)
  const touchState = (setListener === setHybridListener ? new TouchState(target) : undefined);

  // parse the eventsAndHandlers object one key at a time
  Object.keys(eventsAndHandlers).forEach(key => {
    const handler = eventsAndHandlers[key];
    const { events, listenerOptions } = parseKey(key);
    events.forEach(event => {
      setListener({ target, event, handler, listenerOptions, touchState, pointerOptions });
    });
  });
}
