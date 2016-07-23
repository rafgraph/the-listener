import detectIt from 'detect-it';
import { mouseEventsMap, touchEventsMap } from './eventMaps';
import hasPassive from './detectPassiveSupport';

function setTouchListener() {

}

function setMouseListener() {

}

function setHybridListener() {

}

function setPointerListener() {

}

function TouchState() {

}

function getListenerType() {
  const dIt = detectIt;
  const type = dIt.deviceType;
  if (type === 'mouseOnly') return [setMouseListener, undefined];
  if (type === 'touchOnly' && dIt.hasTouchEventsApi) return [setTouchListener, undefined];
  if (type === 'hybrid' && dIt.hasTouchEventsApi) return [setHybridListener, new TouchState];
  if (dIt.hasTouch && dIt.hasPointerEventsApi) return [setPointerListener, undefined];
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
  const [setListener, touchState] = getListenerType();
  Object.keys(eventsAndHandlers).forEach(key => {
    const { events, listenerOptions } = parseKey(key);
    events.forEach(event => {
      setListener({ event, target, listenerOptions, touchState, pointerOptions });
    });
  });
}
