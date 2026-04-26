// Single shared EventEmitter for the whole process. Producers (controllers)
// emit; subscribers (services) register a handler at boot. Decouples session
// flow from notification delivery — neither side knows about the other.
const { EventEmitter } = require('events');

class AppEventBus extends EventEmitter {}

const bus = new AppEventBus();
// Many subscribers may eventually listen — silence the default warning.
bus.setMaxListeners(50);

const EVENTS = Object.freeze({
  SESSION_ACTION: 'session.action', // pause / postpone / cancel
});

const ACTION_TYPES = Object.freeze({
  PAUSE:    'PAUSE',
  POSTPONE: 'POSTPONE',
  CANCEL:   'CANCEL',
});

module.exports = { bus, EVENTS, ACTION_TYPES };
