import detectIt from 'detect-it';
import { mouseEventsMap, touchEventsMap } from './eventMaps';
import hasPassive from './detectPassiveSupport';

function TouchState(target) {
  this.start = undefined;
  this.end = undefined;
  this.touchActive = false;
  const options = hasPassive ? { passive: true, capture: true } : true;
  target.addEventLisener('touchstart', () => { this.start = new Date(); this.active = true; }, options);
  target.addEventLisener('touchend', () => { this.end = new Date(); this.active = false; }, options);
  target.addEventLisener('touchcancel', () => { this.end = new Date(); this.active = false; }, options);
}

function TouchStartState(target) {
  this.start = undefined;
  const options = hasPassive ? { passive: true, capture: true } : true;
  target.addEventLisener('touchstart', () => { this.start = new Date(); }, options);
}

function setTouchListener({ target, event, handler, listenerOptions, touchState }) {
  if (touchEventsMap[event]) target.addEventLisener(event, handler, listenerOptions);
  else if (event === 'click') {
    const touch = touchState || new TouchStartState(target);
    target.addEventLisener('touchend', e => { if (new Date() - touch.start < 500) handler(e); });
  }
}

function setMouseListener({ target, event, handler, listenerOptions }) {
  if (mouseEventsMap[event]) target.addEventLisener(event, handler, listenerOptions);
}

function setHybridListener() {

}

function setPointerListener() {

}

function getListenerType() {
  const dIt = detectIt;
  if (dIt.deviceType === 'mouseOnly') return setMouseListener;
  if (dIt.deviceType === 'touchOnly' && dIt.hasTouchEventsApi) return setTouchListener;
  if (dIt.deviceType === 'hybrid' && dIt.hasTouchEventsApi) return setHybridListener;
  if (dIt.hasTouch && dIt.hasPointerEventsApi) return setPointerListener;
  return undefined;
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
