'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { MyHomeClient } = require('../lib/mhclient');

for (const runtime of ['homebridge', 'homebridge-v1']) test(runtime + ': real API loads clean config and creates relay, dimmer and blind services without hardware', async t => {
    const { HomebridgeAPI } = await import(pathToFileURL(path.join(path.dirname(require.resolve(runtime)), 'api.js')));
    const api = new HomebridgeAPI();
    const registrations = [];
    api.on('registerPlatform', (...args) => registrations.push(args));
    require('../index')(api);
    assert.equal(registrations.length, 2);
    // Homebridge emits alias, constructor, plugin identifier.
    assert.ok(registrations.every(r => r.includes('homebridge-myhome-hb2')));
    const registration = registrations.find(r => r.includes('LegrandMyHome'));
    const Platform = registration.find(r => typeof r === 'function');
    const messages = [];
    const log = Object.assign(message => messages.push(message), { info: m => messages.push(m), warn: m => messages.push(m), error: m => messages.push(m), debug() {} });
    let starts = 0;
    const original = MyHomeClient.prototype.start;
    MyHomeClient.prototype.start = function () { starts++; };
    t.after(() => { MyHomeClient.prototype.start = original; api.emit('shutdown'); });
    for (const config of [undefined, {}, { ipaddress: '192.0.2.10' }, require('../sample_config.json').platforms[0]]) {
        const platform = new Platform(log, config, api);
        platform.accessories(devices => assert.deepEqual(devices, []));
    }
    assert.equal(starts, 0);
    const platform = new Platform(log, { ipaddress: '192.0.2.10', devices: [
        { accessory: 'MHRelay', name: 'Relay', address: '0/0/3' },
        { accessory: 'MHDimmer', name: 'Dimmer', address: '0/0/4' },
        { accessory: 'MHBlind', name: 'Blind', address: '0/0/3', time: 28 },
        { accessory: 'MHBlindAdvanced', name: 'Advanced', address: '0/0/5' },
    ] }, api);
    assert.equal(starts, 1);
    assert.equal(platform.controller.port, 20000);
    platform.accessories(devices => {
        assert.equal(devices.length, 4);
        for (const device of devices) assert.ok(device.getServices().length >= 2);
    });
    new Platform(log, { ipaddress: '192.0.2.10', devices: [{ accessory: 'MHBlind', name: 'Invalid', address: '0/0/3' }] }, api);
    assert.equal(starts, 1);
    assert.ok(messages.some(m => m.includes('configuração inválida')));
});
