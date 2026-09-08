'use strict';
const { test, afterEach } = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const fs = require('node:fs');
const vm = require('node:vm');
const { MatterRelayPlatform, platforms } = require('../lib/matter-relay');
const { MyHomeClient } = require('../lib/mhclient');

// Exercise actual legacy relay/platform methods without sockets or third-party timers.
const sandbox = { require: name => {
    if (name === './lib/matter-relay') return require('../lib/matter-relay');
    if (name === './package.json') return require('../package.json');
    if (name === 'sprintf-js') return { sprintf: (s, ...args) => s.replace(/%s/g, () => args.shift()) };
    if (['path', 'util', 'events', 'fs'].includes(name)) return require(name);
    return {};
}, module: { exports: {} }, __dirname: require('node:path').resolve(__dirname, '..'), Buffer, setTimeout, clearTimeout };
vm.runInNewContext(fs.readFileSync(require.resolve('../index'), 'utf8') + '\nmodule.exports = { MHRelay, LegrandMyHome }; Characteristic = { On: "On", Active: "Active", ContactSensorState: "ContactSensorState", LeakDetected: "LeakDetected", MotionDetected: "MotionDetected", Brightness: "Brightness" };', sandbox);
const { MHRelay, LegrandMyHome } = sandbox.module.exports;
const log = { info() {}, warn() {}, error() {}, debug() {} };
afterEach(() => platforms.clear());

function fixture(config = {}) {
    const calls = [];
    const relay = Object.assign(Object.create(MHRelay.prototype), {
        config: { accessory: 'MHRelay' }, address: '0/0/3', name: 'EMBUTIDO 1', power: false,
        bri: 0, ambient: 0, pul: false,
        mh: { send: frame => calls.push(['frame', frame]), relayCommand: (...args) => calls.push(['command', ...args]), getRelayState: a => calls.push(['query', a]) },
        lightBulbService: { updateCharacteristic: (...args) => calls.push(['hap', ...args]), getCharacteristic: () => ({ emit() {} }) },
    });
    const parent = { config: { ipaddress: '192.0.2.1', port: 20000 }, devices: [relay], controller: { getRelayState: a => calls.push(['query', a]) } };
    platforms.add(parent);
    const api = new EventEmitter();
    api.hap = { uuid: { generate: s => require('node:crypto').createHash('sha256').update(s).digest('hex').slice(0, 32).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5') } };
    api.matter = {
        deviceTypes: { OnOffLight: { id: 0x100 } },
        registerPlatformAccessories: async (...args) => calls.push(['register', ...args]),
        unregisterPlatformAccessories: async (...args) => calls.push(['remove', ...args]),
        updateAccessoryState: async (...args) => calls.push(['state', ...args]),
    };
    const bridge = new MatterRelayPlatform(log, { address: "0/0/3", ...config }, api);
    return { bridge, relay, parent, calls, api };
}

test('publishes exactly one OnOffLight; Matter commands preserve HAP and custom frames', async () => {
    const f = fixture();
    await f.bridge.start();
    await Promise.all([...f.bridge.bindings.values()].map(b => b.pending));
    const registration = f.calls.find(c => c[0] === 'register');
    assert.equal(registration[3].length, 1);
    const accessory = registration[3][0];
    assert.match(accessory.serialNumber, /^[a-f0-9]{32}$/);
    assert.equal(accessory.deviceType, f.api.matter.deviceTypes.OnOffLight);
    await accessory.handlers.onOff.on();
    assert.equal(f.relay.power, true);
    assert.ok(f.calls.some(c => c[0] === 'hap' && c[2] === true));
    f.relay.config.frame_off = '*1*0*99##';
    await accessory.handlers.onOff.off();
    assert.ok(f.calls.some(c => c[0] === 'frame' && c[1] === '*1*0*99##'));
    await accessory.handlers.onOff.toggle();
    assert.equal(f.relay.power, true);
});

test('HAP and individual/general monitor events synchronize Matter without command loops', async () => {
    const f = fixture();
    await f.bridge.start();
    f.relay.setPower(true);
    await Promise.all([...f.bridge.bindings.values()].map(b => b.pending));
    assert.equal(f.calls.filter(c => c[0] === 'state').at(-1)[3].onOff, true);
    const count = f.calls.filter(c => c[0] === 'command').length;
    LegrandMyHome.prototype.onRelay.call(f.parent, '0/0/3', false);
    assert.ok(f.calls.some(c => c[0] === 'hap' && c[1] === 'On' && c[2] === false));
    await Promise.all([...f.bridge.bindings.values()].map(b => b.pending));
    assert.equal(f.calls.filter(c => c[0] === 'state').at(-1)[3].onOff, false);
    LegrandMyHome.prototype.onRelay.call(f.parent, '0/0/0', true);
    await Promise.all([...f.bridge.bindings.values()].map(b => b.pending));
    assert.equal(f.calls.filter(c => c[0] === 'state').at(-1)[3].onOff, true);
    assert.equal(f.calls.filter(c => c[0] === 'command').length, count);
});

test('command replies and contact/scenario events publish fresh HomeKit values', () => {
    const relayEvents = [];
    const client = Object.assign(Object.create(MyHomeClient.prototype), {
        parent: { onMonitor() {}, onRelay: (...args) => relayEvents.push(args) },
        dimmerLevels: [0, 100, 1, 10, 20, 30, 40, 50, 60, 75, 100],
    });
    client.onCommand('*1*1*03##');
    assert.deepEqual(relayEvents, [['0/0/3', true]]);

    const updates = [];
    const service = { updateCharacteristic: (...args) => updates.push(args) };
    const parent = { devices: [
        { address: 7, type: 'Contact', state: false, dryContactService: service },
        { address: 8, state: 0, running: 0, scenarioService: service },
    ] };
    LegrandMyHome.prototype.onDryContact.call(parent, 7, true);
    LegrandMyHome.prototype.onScenarioEnable.call(parent, 8, true);
    LegrandMyHome.prototype.onScenarioRun.call(parent, 8, true);
    assert.ok(updates.some(update => update[0] === 'ContactSensorState' && update[1] === true));
    assert.ok(updates.some(update => update[0] === 'Active' && update[1] === 1));
    assert.ok(updates.some(update => update[1] === true));
});

test('restart reuses UUID, restores handlers, removes stale cached targets', async () => {
    const f = fixture();
    await f.bridge.start();
    const originalUuid = [...f.bridge.bindings.keys()][0];
    delete f.relay.matterRelay;
    const second = new MatterRelayPlatform(log, { address: "0/0/3" }, f.api);
    second.configureMatterAccessory({ UUID: originalUuid });
    second.configureMatterAccessory({ UUID: 'old-target' });
    await second.start();
    assert.equal([...second.bindings.keys()][0], originalUuid);
    assert.equal(f.calls.find(c => c[0] === 'remove')[3][0].UUID, 'old-target');
    assert.equal(typeof f.calls.filter(c => c[0] === 'register').at(-1)[3][0].handlers.onOff.on, 'function');
});

test('missing/ambiguous/disabled target publishes nothing', async () => {
    for (const config of [{ address: '0/0/99' }, { enabled: false }]) {
        const f = fixture(config);
        await f.bridge.start();
        assert.equal(f.calls.some(c => c[0] === 'register'), false);
        platforms.clear();
    }
    const f = fixture();
    f.parent.devices.push(f.relay);
    await f.bridge.start();
    assert.equal(f.calls.some(c => c[0] === 'register'), false);
});

test('Matter disabled leaves HAP usable; rejected state updates are contained', async () => {
    const f = fixture();
    const matter = f.api.matter;
    f.api.matter = undefined;
    await f.bridge.start();
    f.relay.setPower(true);
    assert.equal(f.relay.power, true);
    f.api.matter = matter;
    await f.bridge.start();
    matter.updateAccessoryState = async () => { throw new Error('offline'); };
    f.relay.matterRelay.sync(false);
    await Promise.all([...f.bridge.bindings.values()].map(b => b.pending));
});

test('multiple selected relays have independent handlers, states and stable identities', async () => {
    const f = fixture({ mode: 'configured' });
    f.relay.config.matter = true;
    const second = Object.assign(Object.create(MHRelay.prototype), f.relay, {
        address: '0/0/9', name: 'Abajur', config: { accessory: 'MHRelay', matter: true },
    });
    f.parent.devices.push(second, { config: { accessory: 'MHRelay', matter: false }, address: '0/1/4' });
    await f.bridge.start();
    const registered = f.calls.filter(c => c[0] === 'register').map(c => c[3][0]);
    assert.equal(registered.length, 2);
    assert.notEqual(registered[0].UUID, registered[1].UUID);
    await registered[1].handlers.onOff.on();
    assert.equal(second.power, true);
    assert.equal(f.relay.power, false);
    f.relay.matterRelay.sync(true);
    second.matterRelay.sync(false);
    await Promise.all([...f.bridge.bindings.values()].map(b => b.pending));
    assert.equal(f.calls.filter(c => c[0] === 'state' && c[1] === registered[0].UUID).at(-1)[3].onOff, true);
    assert.equal(f.calls.filter(c => c[0] === 'state' && c[1] === registered[1].UUID).at(-1)[3].onOff, false);
});

test('removing selection removes stale Matter accessory while leaving HAP device intact', async () => {
    const f = fixture({ mode: 'configured' });
    f.bridge.configureMatterAccessory({ UUID: 'removed' });
    await f.bridge.start();
    assert.equal(f.calls.find(c => c[0] === 'remove')[3][0].UUID, 'removed');
    assert.equal(f.parent.devices.length, 1);
    f.relay.setPower(true);
    assert.equal(f.relay.power, true);
});

test('rejects duplicate physical addresses, unsupported Matter types and general addresses', async () => {
    const f = fixture({ mode: 'configured' });
    f.relay.config.matter = true;
    f.parent.devices.push(
        { config: { accessory: 'MHRelay', matter: true }, address: '0/0/03' },
        { config: { accessory: 'MHDimmer', matter: true }, address: '0/1/8' },
        { config: { accessory: 'MHRelay', matter: true }, address: '0/0/0' });
    await f.bridge.start();
    assert.equal(f.calls.some(c => c[0] === 'register'), false);
});

test('failure of one registration does not prevent other relays from registering', async () => {
    const f = fixture({ mode: 'configured' });
    f.relay.config.matter = true;
    const second = Object.assign(Object.create(MHRelay.prototype), f.relay, { address: '0/0/7' });
    f.parent.devices.push(second);
    let attempts = 0;
    f.api.matter.registerPlatformAccessories = async () => { if (++attempts === 1) throw new Error('registration failed'); };
    await f.bridge.start();
    assert.equal(attempts, 2);
    assert.equal(f.relay.matterRelay, undefined);
    assert.equal(second.matterRelay.ready, true);
});

test('shutdown blocks commands and queued state writes', async () => {
    const f = fixture();
    await f.bridge.start();
    await Promise.all([...f.bridge.bindings.values()].map(b => b.pending));
    const stateCount = f.calls.filter(c => c[0] === 'state').length;
    f.api.emit('shutdown');
    f.relay.matterRelay.sync(true);
    const a = f.calls.find(c => c[0] === 'register')[3][0];
    await assert.rejects(a.handlers.onOff.on(), /not ready/);
    assert.equal(f.calls.filter(c => c[0] === 'state').length, stateCount);
});
