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
  function endTouch() {
    this.end = Date.now();
    this.active = false;
  }
  const options = hasPassive ? { passive: true, capture: true } : true;
  target.addEventListener('touchstart', () => { this.start = Date.now(); this.active = true; }, options);
  target.addEventListener('touchend', (e) => { (e.targetTouches.length === 0) && endTouch(); }, options);
  target.addEventListener('touchcancel', (e) => { (e.targetTouches.length === 0) && endTouch(); }, options);
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
function setTouchListener({ target, event, handler, listenerOptions, touchState, setWith }) {
  if (setWith && setWith !== 'setWithTouch') return;

  // if the event is a known touch event, then set event listener
  if (touchEventsMap[event]) target.addEventListener(event, handler, listenerOptions);

  // if the event is a click event, then call the handler on touchend if within 500ms of touchstart
  else if (event === 'click') {
    // if touchState not passed in, then create a new touchState
    const touch = touchState || new TouchState(target);
    target.addEventListener('touchend', e => { (Date.now() - touch.start < 500) && handler(e); }, listenerOptions);

    // if it's a touch only device, still listen for click events that are fired synthetically, e.g. assistive tech
    if (detectIt.deviceType === 'touchOnly') {
      target.addEventListener(
        'click', e => { (!touch.active && Date.now() - touch.end > 600) && handler(e); }, listenerOptions
      );
    }
  } else if (!mouseEventsMap[event] || setWith === 'setWithTouch') {
    target.addEventListener(event, handler, listenerOptions);
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
function setMouseListener({ target, event, handler, listenerOptions, setWith }) {
  if (setWith && setWith !== 'setWithMouse') return;

  // if the event is a known mouse event, then set the listener
  if (mouseEventsMap[event] || (!touchEventsMap[event] || setWith === 'setWithMouse')) {
    target.addEventListener(event, handler, listenerOptions);
  }
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
      event, e => { (!touchState.active && Date.now() - touchState.end > 600) && handler(e); }, listenerOptions
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

  const pointerType = {
    touch: 'touch',
    2: 'touch',
    pen: 'touch',
    3: 'touch',
    mouse: 'mouse',
    4: 'mouse',
  };

  // access prefix function for pointer events
  const pfix = detectIt.pointerEventsPrefix;

  if (ptrMouseEvent === 'click' || ptrMouseEvent === 'dblclick') {
    // if the event is a click or double click event, then set event listener with handler
    target.addEventListener(ptrMouseEvent, handler, listenerOptions);
  } else if (ptrMouseEvent) {
    // if the event is a mouse event, then set pointer listener and only call the handler if pointType is a mouse
    target.addEventListener(
      pfix(ptrMouseEvent), e => { (pointerType[e.pointerType] === 'mouse') && handler(e); }, listenerOptions
    );
  } else if (ptrTouchEvent) {
    // if the event is a touch event, then set pointer listener and only call handler if pointType is touch or pen
    target.addEventListener(
      pfix(ptrTouchEvent), e => { (pointerType[e.pointerType] === 'touch') && handler(e); }, listenerOptions
    );
  } else {
    target.addEventListener(pfix(event), handler, listenerOptions);
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
 * getSetWith() returns the setWith option based on the options present in the key string
 *
 * @param {Boolean} setWithMouse
 * @param {Boolean} setWithTouch
 * @param {Boolean} setWithHybrid
 * @return {String or undefined} setWith event listener option
 */
function getSetWith(setWithMouse, setWithTouch, setWithHybrid) {
  if (setWithMouse && setWithTouch) return undefined;
  if (setWithMouse) return 'setWithMouse';
  if (setWithTouch) return 'setWithTouch';
  if (setWithHybrid) return 'setWithHybrid';
  return undefined;
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
  const optionsList = { passive: 1, capture: 1, setWithMouse: 1, setWithTouch: 1, setWithHybrid: 1 };
  return {
    events: eventsAndOptions.filter(value => !optionsList[value]),
    listenerOptions: getListenerOptions(
      eventsAndOptions.indexOf('passive') !== -1,
      eventsAndOptions.indexOf('capture') !== -1
    ),
    setWith: getSetWith(
      eventsAndOptions.indexOf('setWithMouse') !== -1,
      eventsAndOptions.indexOf('setWithTouch') !== -1,
      eventsAndOptions.indexOf('setWithHybrid') !== -1
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
    const { events, listenerOptions, setWith } = parseKey(key);
    events.forEach(event => {
      setListener({ target, event, handler, listenerOptions, touchState, pointerOptions, setWith });
    });
  });
}
