import detectIt from 'detect-it';
import { mouseEventsMap, touchEventsMap } from './eventMaps';
import hasPassive from './detectPassiveSupport';

function TouchState(target) {
  this.start = undefined;
  this.end = undefined;
  this.active = false;
  const options = hasPassive ? { passive: true, capture: true } : true;
  target.addEventListener('touchstart', () => { this.start = new Date(); this.active = true; }, options);
  target.addEventListener('touchend', () => { this.end = new Date(); this.active = false; }, options);
  target.addEventListener('touchcancel', () => { this.end = new Date(); this.active = false; }, options);
}

function TouchStartState(target) {
  this.start = undefined;
  const options = hasPassive ? { passive: true, capture: true } : true;
  target.addEventListener('touchstart', () => { this.start = new Date(); }, options);
}

function setTouchListener({ target, event, handler, listenerOptions, touchState }) {
  if (touchEventsMap[event]) target.addEventListener(event, handler, listenerOptions);
  else if (event === 'click') {
    const touch = touchState || new TouchStartState(target);
    target.addEventListener('touchend', e => { if (new Date() - touch.start < 500) handler(e); }, listenerOptions);
  }
}

function setMouseListener({ target, event, handler, listenerOptions }) {
  if (mouseEventsMap[event]) target.addEventListener(event, handler, listenerOptions);
}

function setHybridListener({ target, event, handler, listenerOptions, touchState }) {
  setTouchListener({ target, event, handler, listenerOptions, touchState });
  if (mouseEventsMap[event]) {
    target.addEventListener(
      event, e => { if (!touchState.active && new Date() - touchState.end > 600) handler(e); }, listenerOptions
    );
  }
}

function setPointerListener({ target, event, handler, listenerOptions, pointerOptions }) {
  const ptrTouchEvent = touchEventsMap[event];
  const ptrMouseEvent = mouseEventsMap[event];
  if (pointerOptions && (pointerOptions[ptrTouchEvent] === false || pointerOptions[ptrMouseEvent] === false)) return;
  function pointerType(e) {
    if (['touch', 2, 'pen', 3].indexOf(e.pointerType) !== -1) return 'touch';
    if (['mouse', 4].indexOf(e.pointerType) !== -1) return 'mouse';
    return undefined;
  }
  const pfix = detectIt.pointerEventsPrefix;
  if (ptrMouseEvent === 'click' || ptrMouseEvent === 'dblclick') {
    target.addEventListener(ptrMouseEvent, handler, listenerOptions);
  } else if (ptrMouseEvent) {
    target.addEventListener(pfix(ptrMouseEvent), e => { if (pointerType(e) === 'mouse') handler(e); }, listenerOptions);
  } else if (ptrTouchEvent) {
    target.addEventListener(pfix(ptrTouchEvent), e => { if (pointerType(e) === 'touch') handler(e); }, listenerOptions);
  }
}

function getListenerType() {
  const dIt = detectIt;
  if (dIt.deviceType === 'mouseOnly') return setMouseListener;
  if (dIt.deviceType === 'touchOnly' && dIt.hasTouchEventsApi) return setTouchListener;
  if (dIt.deviceType === 'hybrid' && dIt.hasTouchEventsApi) return setHybridListener;
  if (dIt.hasTouch && dIt.hasPointerEventsApi) return setPointerListener;
  return function cantSetListeners() {};
}

function getListenerOptions(passive, capture) {
  if (!passive || !hasPassive) return capture;
  return { capture, passive };
}

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


export default function addListener(target, eventsAndHandlers, pointerOptions) {
  const setListener = getListenerType();
  const touchState = (setListener === setHybridListener ? new TouchState(target) : undefined);
  Object.keys(eventsAndHandlers).forEach(key => {
    const handler = eventsAndHandlers[key];
    const { events, listenerOptions } = parseKey(key);
    events.forEach(event => {
      setListener({ target, event, handler, listenerOptions, touchState, pointerOptions });
    });
  });
}
