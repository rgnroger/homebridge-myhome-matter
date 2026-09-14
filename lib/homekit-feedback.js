'use strict';

function pushValue(service, characteristic, value) {
  if (!service || characteristic === undefined) return;
  service.getCharacteristic(characteristic).updateValue(value);
}

function applySimpleBlindFeedback(accessory, action, Characteristic) {
  if (![0, 1, 2].includes(action)) return;

  clearInterval(accessory.updateTimer);
  accessory.updateTimer = 0;

  if (action === 0) {
    accessory.state = Characteristic.PositionState.STOPPED;
    accessory.evaluatePosition();
  } else {
    const movesUp = (action === 1 && !accessory.invert)
      || (action === 2 && accessory.invert);
    accessory.state = movesUp
      ? Characteristic.PositionState.INCREASING
      : Characteristic.PositionState.DECREASING;
    accessory.targetPosition = movesUp ? 100 : 0;
    accessory.evaluatePosition();
    accessory.updateTimer = setInterval(() => {
      accessory.evaluatePosition();
      pushValue(
        accessory.windowCoveringService,
        Characteristic.CurrentPosition,
        accessory.currentPosition,
      );
    }, 500);
  }

  pushValue(accessory.windowCoveringService, Characteristic.PositionState, accessory.state);
  pushValue(accessory.windowCoveringService, Characteristic.CurrentPosition, accessory.currentPosition);
  pushValue(accessory.windowCoveringService, Characteristic.TargetPosition, accessory.targetPosition);
}

function applyAdvancedBlindFeedback(accessory, action, position, Characteristic) {
  accessory.currentPosition = position;

  if (action === 'STOP') {
    accessory.targetPosition = position;
    accessory.state = Characteristic.PositionState.STOPPED;
  } else if (action === 'UP') {
    accessory.targetPosition = 100;
    accessory.state = Characteristic.PositionState.INCREASING;
  } else if (action === 'DOWN') {
    accessory.targetPosition = 0;
    accessory.state = Characteristic.PositionState.DECREASING;
  } else {
    return;
  }

  pushValue(accessory.windowCoveringPlusService, Characteristic.CurrentPosition, accessory.currentPosition);
  pushValue(accessory.windowCoveringPlusService, Characteristic.TargetPosition, accessory.targetPosition);
  pushValue(accessory.windowCoveringPlusService, Characteristic.PositionState, accessory.state);
}

module.exports = {
  applyAdvancedBlindFeedback,
  applySimpleBlindFeedback,
  pushValue,
};
