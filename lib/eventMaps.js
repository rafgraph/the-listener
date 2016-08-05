'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
var mouseEventsMap = {
  click: 'click',
  dblclick: 'dblclick',
  mousedown: 'pointerdown',
  mouseup: 'pointerup',
  mouseenter: 'pointerenter',
  mouseleave: 'pointerleave',
  mouseover: 'pointerover',
  mouseout: 'pointerout',
  mousemove: 'pointermove'
};

var touchEventsMap = {
  touchstart: 'pointerdown',
  touchend: 'pointerup',
  touchmove: 'pointermove',
  touchcancel: 'pointercancel'
};

exports.mouseEventsMap = mouseEventsMap;
exports.touchEventsMap = touchEventsMap;