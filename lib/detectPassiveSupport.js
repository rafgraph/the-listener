'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
// adapted from https://github.com/WICG/EventListenerOptions/blob/gh-pages/explainer.md
var passive = false;
try {
  var options = Object.defineProperty({}, 'passive', {
    get: function get() {
      passive = true;
    }
  });
  window.addEventListener('test', null, options);
} catch (e) {}

var hasPassive = passive;
exports.default = hasPassive;