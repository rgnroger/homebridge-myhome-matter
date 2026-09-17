'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeVisualConfig } = require('../lib/config');
const fs = require('node:fs');
const path = require('node:path');

test('ignores empty rows created by the configuration UI', () => {
    const config = normalizeVisualConfig({
        host: '192.168.1.10',
        advancedBlinds: [{ bus: 0 }, {}],
        auxContacts: [{}, { name: 'Missing channel' }, { name: '', channel: 1 }],
    });

    assert.deepEqual(config.devices, []);
});

test('converts 3477 dry contacts into WHO 25 open and closed sensors', () => {
    const config = normalizeVisualConfig({
        host: '192.168.1.10',
        auxContacts: [
            { name: 'DOOR', channel: 1 },
            { name: 'GATE', channel: 2, invert: true },
            { name: 'Invalid channel', channel: 9 },
        ],
    });

    assert.deepEqual(config.devices, [
        { accessory: 'MHDryContact', name: 'DOOR', address: 1, type: 'Contact', visualDryContact: true, invert: false },
        { accessory: 'MHDryContact', name: 'GATE', address: 2, type: 'Contact', visualDryContact: true, invert: true },
    ]);
});

test('visual 3477 contacts do not require fakegato-history', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
    const visualBranch = source.indexOf('if (this.visualDryContact)');
    const fakeGatoBranch = source.indexOf("if (this.config.storage == 'fs')", visualBranch);

    assert.notEqual(visualBranch, -1);
    assert.ok(fakeGatoBranch > visualBranch);
    assert.match(source.slice(visualBranch, fakeGatoBranch), /return \[service, this\.dryContactService\]/);
});

test('converts one 4680 CEN+ control into four programmable buttons', () => {
    const config = normalizeVisualConfig({
        host: '192.168.1.10',
        cenPlusControls: [{
            name: 'GARAGE SCENARIOS',
            cen: 1,
            button1: 'ARRIVE',
            button4: 'LEAVE',
        }],
    });

    assert.deepEqual(config.devices, [
        { accessory: 'MHCenPlusButton', button: 1, name: 'ARRIVE', address: 1 },
        { accessory: 'MHCenPlusButton', button: 2, name: 'GARAGE SCENARIOS BT2', address: 1 },
        { accessory: 'MHCenPlusButton', button: 3, name: 'GARAGE SCENARIOS BT3', address: 1 },
        { accessory: 'MHCenPlusButton', button: 4, name: 'LEAVE', address: 1 },
    ]);
});

test('keeps only accessories that have a name, area, and point', () => {
    const config = normalizeVisualConfig({
        host: '192.168.1.10',
        lights: [
            { name: 'CEILING LIGHT', area: 1, point: 1, bus: 0, matter: 'enabled' },
            { name: '', area: 1, point: 2, bus: 0 },
            { name: 'Missing point', area: 1, bus: 0 },
        ],
        blinds: [
            { name: 'SHADE', area: 1, point: 3, bus: 0, travelTime: 30, invert: true },
        ],
    });

    assert.deepEqual(config.devices, [
        { accessory: 'MHRelay', name: 'CEILING LIGHT', address: '0/1/1', matter: true },
        { accessory: 'MHBlind', name: 'SHADE', address: '0/1/3', time: 30, invert: true },
    ]);
});
