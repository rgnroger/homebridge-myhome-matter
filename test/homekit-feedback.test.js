'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const {
  applyAdvancedBlindFeedback,
  applySimpleBlindFeedback,
  contactSensorStateFromDryContact,
  pushValue,
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

test('converte fechamento WHO 25 para o estado fechado do HomeKit', () => {
  assert.equal(contactSensorStateFromDryContact(true, false), false);
  assert.equal(contactSensorStateFromDryContact(false, false), true);
  assert.equal(contactSensorStateFromDryContact(true, true), true);
  assert.equal(contactSensorStateFromDryContact(false, true), false);
});

test('envia imediatamente o feedback de luz ao HomeKit', () => {
  const updates = [];
  pushValue(fakeService(updates), Characteristic.On, false);
  assert.deepEqual(updates, [{ type: 'On', value: false }]);
});

test('envia posição final da persiana avançada ao HomeKit', () => {
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

test('persiana comum informa movimento físico e não acumula temporizadores', (t) => {
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
