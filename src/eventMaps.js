const mouseEventsMap = {
  click: 'click',
  dblclick: 'dblclick',
  mousedown: 'pointerdown',
  mouseup: 'pointerup',
  mouseenter: 'pointerenter',
  mouseleave: 'pointerleave',
  mouseover: 'pointerover',
  mouseout: 'pointerout',
  mousemove: 'pointermove',
};

const touchEventsMap = {
  touchstart: 'pointerdown',
  touchend: 'pointerup',
  touchmove: 'pointermove',
  touchcancel: 'pointercancel',
};

export { mouseEventsMap, touchEventsMap };
