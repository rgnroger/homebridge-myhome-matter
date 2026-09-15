'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  applyAdvancedBlindFeedback,
  applySimpleBlindFeedback,
  cenPlusEventToHomeKit,
  contactSensorStateFromDryContact,
  pushValue,
  sendEvent,
} = require('../lib/homekit-feedback');

const Characteristic = {
  On: 'On',
  CurrentPosition: 'CurrentPosition',
  TargetPosition: 'TargetPosition',
  PositionState: {
    STOPPED: 2,
    INCREASING: 1,
    DECREASING: 0,
  },
  ProgrammableSwitchEvent: {
    SINGLE_PRESS: 0,
    DOUBLE_PRESS: 1,
    LONG_PRESS: 2,
  },
};

function fakeService(updates) {
  return {
    getCharacteristic(type) {
      return {
        updateValue(value) {
          updates.push({ type, value });
        },
      };
    },
  };
}

test('preserves the observed WHO 25 contact polarity in HomeKit', () => {
  assert.equal(contactSensorStateFromDryContact(true, false), true);
  assert.equal(contactSensorStateFromDryContact(false, false), false);
  assert.equal(contactSensorStateFromDryContact(true, true), false);
  assert.equal(contactSensorStateFromDryContact(false, true), true);
});

test('sends only CEN+ short press and long-press release to HomeKit', () => {
  assert.equal(cenPlusEventToHomeKit('SHORT_PRESS', Characteristic), 0);
  assert.equal(cenPlusEventToHomeKit('START_EXTENDED_PRESS', Characteristic), null);
  assert.equal(cenPlusEventToHomeKit('EXTENDED_PRESS', Characteristic), null);
  assert.equal(cenPlusEventToHomeKit('RELEASE_EXTENDED_PRESS', Characteristic), 2);
});

test('forces repeated CEN+ events to HomeKit', () => {
  const notifications = [];
  const service = {
    getCharacteristic() {
      return {
        sendEventNotification(value) {
          notifications.push(value);
        },
      };
    },
  };

  sendEvent(service, 'ProgrammableSwitchEvent', 0);
  sendEvent(service, 'ProgrammableSwitchEvent', 0);
  assert.deepEqual(notifications, [0, 0]);
});

test('sends light feedback to HomeKit immediately', () => {
  const updates = [];
  pushValue(fakeService(updates), Characteristic.On, false);
  assert.deepEqual(updates, [{ type: 'On', value: false }]);
});

test('sends the advanced blind final position to HomeKit', () => {
  const updates = [];
  const accessory = {
    windowCoveringPlusService: fakeService(updates),
    currentPosition: 0,
    targetPosition: 100,
    state: Characteristic.PositionState.INCREASING,
  };

  applyAdvancedBlindFeedback(accessory, 'STOP', 47, Characteristic);

  assert.equal(accessory.currentPosition, 47);
  assert.equal(accessory.targetPosition, 47);
  assert.equal(accessory.state, Characteristic.PositionState.STOPPED);
  assert.deepEqual(updates, [
    { type: 'CurrentPosition', value: 47 },
    { type: 'TargetPosition', value: 47 },
    { type: Characteristic.PositionState, value: Characteristic.PositionState.STOPPED },
  ]);
});

test('standard blind reports physical movement without accumulating timers', (t) => {
  const updates = [];
  const accessory = {
    windowCoveringService: fakeService(updates),
    updateTimer: 0,
    invert: false,
    state: Characteristic.PositionState.STOPPED,
    currentPosition: 30,
    targetPosition: 30,
    evaluatePosition() {},
  };
  t.after(() => clearInterval(accessory.updateTimer));

  applySimpleBlindFeedback(accessory, 1, Characteristic);
  const firstTimer = accessory.updateTimer;
  applySimpleBlindFeedback(accessory, 2, Characteristic);

  assert.notEqual(accessory.updateTimer, firstTimer);
  assert.equal(accessory.state, Characteristic.PositionState.DECREASING);
  assert.equal(accessory.targetPosition, 0);
  assert.deepEqual(updates.slice(-3), [
    { type: Characteristic.PositionState, value: Characteristic.PositionState.DECREASING },
    { type: 'CurrentPosition', value: 30 },
    { type: 'TargetPosition', value: 0 },
  ]);
});
