'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = addListener;

var _detectIt = require('detect-it');

var _detectIt2 = _interopRequireDefault(_detectIt);

var _eventMaps = require('./eventMaps');

var _detectPassiveSupport = require('./detectPassiveSupport');

var _detectPassiveSupport2 = _interopRequireDefault(_detectPassiveSupport);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/**
 * TouchState() constructor keeps track of the touch state for a target:
 * time of the last touchstart, the time of the last touchend,
 * and if the target is touched now, i.e. in touch active state
 *
 * @param {EventTarget}  target
 * @return {TouchState}
 */
function TouchState(target) {
  var _this = this;

  this.start = undefined;
  this.end = undefined;
  this.active = false;
  var options = _detectPassiveSupport2.default ? { passive: true, capture: true } : true;
  target.addEventListener('touchstart', function () {
    _this.start = Date.now();_this.active = true;
  }, options);
  target.addEventListener('touchend', function () {
    _this.end = Date.now();_this.active = false;
  }, options);
  target.addEventListener('touchcancel', function () {
    _this.end = Date.now();_this.active = false;
  }, options);
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
function setTouchListener(_ref) {
  var target = _ref.target;
  var event = _ref.event;
  var handler = _ref.handler;
  var listenerOptions = _ref.listenerOptions;
  var touchState = _ref.touchState;
  var setWith = _ref.setWith;

  if (setWith && setWith !== 'setWithTouch') return;

  // if the event is a known touch event, then set event listener
  if (_eventMaps.touchEventsMap[event]) target.addEventListener(event, handler, listenerOptions);

  // if the event is a click event, then call the handler on touchend if within 500ms of touchstart
  else if (event === 'click') {
      (function () {
        // if touchState not passed in, then create a new touchState
        var touch = touchState || new TouchState(target);
        target.addEventListener('touchend', function (e) {
          Date.now() - touch.start < 500 && handler(e);
        }, listenerOptions);

        // if it's a touch only device, still listen for click events that are fired synthetically, e.g. assistive tech
        if (_detectIt2.default.deviceType === 'touchOnly') {
          target.addEventListener('click', function (e) {
            !touch.active && Date.now() - touch.end > 600 && handler(e);
          }, listenerOptions);
        }
      })();
    } else if (!_eventMaps.mouseEventsMap[event] || setWith === 'setWithTouch') {
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
function setMouseListener(_ref2) {
  var target = _ref2.target;
  var event = _ref2.event;
  var handler = _ref2.handler;
  var listenerOptions = _ref2.listenerOptions;
  var setWith = _ref2.setWith;

  if (setWith && setWith !== 'setWithMouse') return;

  // if the event is a known mouse event, then set the listener
  if (_eventMaps.mouseEventsMap[event] || !_eventMaps.touchEventsMap[event] || setWith === 'setWithMouse') {
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
function setHybridListener(_ref3) {
  var target = _ref3.target;
  var event = _ref3.event;
  var handler = _ref3.handler;
  var listenerOptions = _ref3.listenerOptions;
  var touchState = _ref3.touchState;

  // set touch listener
  setTouchListener({ target: target, event: event, handler: handler, listenerOptions: listenerOptions, touchState: touchState });

  // if the event is a known mouse event, then set the listener
  if (_eventMaps.mouseEventsMap[event]) {
    target.addEventListener(
    /**
     * Only call the handler if not in touch active state and the event occurred after 600ms
     * from the last touchend event to prevent calling mouse handlers as a result of touch interactions.
     * Based on testing, 600ms seems like sufficient time for all mouse events to fire after
     * the last touchend event. Also, on some devices (notably Android) during a long press the mouse
     * events will fire before touchend while actively touching the screen, so also need
     * to makes sure not in the touch active state.
     */
    event, function (e) {
      !touchState.active && Date.now() - touchState.end > 600 && handler(e);
    }, listenerOptions);
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
function setPointerListener(_ref4) {
  var target = _ref4.target;
  var event = _ref4.event;
  var handler = _ref4.handler;
  var listenerOptions = _ref4.listenerOptions;
  var pointerOptions = _ref4.pointerOptions;

  /**
   * look up the pointer event that corresponds to the event argument (which is a mouse or touch event),
   * note that at least one of ptrTouchEvent and ptrMouseEvent will be undefined
   */
  var ptrTouchEvent = _eventMaps.touchEventsMap[event];
  var ptrMouseEvent = _eventMaps.mouseEventsMap[event];

  // early return w/o setting a listener if pointerOptions says don't set listener for this specific pointer event
  if (pointerOptions && (pointerOptions[ptrTouchEvent] === false || pointerOptions[ptrMouseEvent] === false)) return;

  var pointerType = {
    touch: 'touch',
    2: 'touch',
    pen: 'touch',
    3: 'touch',
    mouse: 'mouse',
    4: 'mouse'
  };

  // access prefix function for pointer events
  var pfix = _detectIt2.default.pointerEventsPrefix;

  if (ptrMouseEvent === 'click' || ptrMouseEvent === 'dblclick') {
    // if the event is a click or double click event, then set event listener with handler
    target.addEventListener(ptrMouseEvent, handler, listenerOptions);
  } else if (ptrMouseEvent) {
    // if the event is a mouse event, then set pointer listener and only call the handler if pointType is a mouse
    target.addEventListener(pfix(ptrMouseEvent), function (e) {
      pointerType[e.pointerType] === 'mouse' && handler(e);
    }, listenerOptions);
  } else if (ptrTouchEvent) {
    // if the event is a touch event, then set pointer listener and only call handler if pointType is touch or pen
    target.addEventListener(pfix(ptrTouchEvent), function (e) {
      pointerType[e.pointerType] === 'touch' && handler(e);
    }, listenerOptions);
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
  var dIt = _detectIt2.default;
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
  if (!passive || !_detectPassiveSupport2.default) return capture;
  return { capture: capture, passive: passive };
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
  var eventsAndOptions = key.split(' ');
  var optionsList = { passive: 1, capture: 1, setWithMouse: 1, setWithTouch: 1, setWithHybrid: 1 };
  return {
    events: eventsAndOptions.filter(function (value) {
      return !optionsList[value];
    }),
    listenerOptions: getListenerOptions(eventsAndOptions.indexOf('passive') !== -1, eventsAndOptions.indexOf('capture') !== -1),
    setWith: eventsAndOptions.indexOf('setWithHybrid') !== -1 && 'setWithHybrid' || eventsAndOptions.indexOf('setWithMouse') !== -1 && 'setWithMouse' || eventsAndOptions.indexOf('setWithTouch') !== -1 && 'setWithTouch' || undefined
  };
}

/**
 * addListener() is the control center for setting listeners
 *
 * @param {EventTarget} target (required)
 * @param {Object} eventsAndHandlers (required)
 * @param {Object} pointerOptions (optional)
 */
function addListener(target, eventsAndHandlers, pointerOptions) {
  // determine what function to use to set listeners based on type of device
  var setListener = getListenerType();

  // create new TouchState if need to keep track of touch state (only for hybrid devices)
  var touchState = setListener === setHybridListener ? new TouchState(target) : undefined;

  // parse the eventsAndHandlers object one key at a time
  Object.keys(eventsAndHandlers).forEach(function (key) {
    var handler = eventsAndHandlers[key];

    var _parseKey = parseKey(key);

    var events = _parseKey.events;
    var listenerOptions = _parseKey.listenerOptions;
    var setWith = _parseKey.setWith;

    events.forEach(function (event) {
      setListener({ target: target, event: event, handler: handler, listenerOptions: listenerOptions, touchState: touchState, pointerOptions: pointerOptions, setWith: setWith });
    });
  });
}