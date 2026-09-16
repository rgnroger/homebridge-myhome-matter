'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const MatterBridge = require('../lib/matter-bridge');

test('registers individual relays and keeps Matter state synchronized', async () => {
    const registered = [];
    const updates = [];
    const commands = [];
    const relay = {
        name: 'Kitchen',
        address: '0/1/1',
        power: false,
        config: { accessory: 'MHRelay' },
        setPower(value) {
            this.power = value;
            commands.push(value);
        },
    };
    const api = {
        hap: { uuid: { generate: value => `uuid:${value}` } },
        matter: {
            deviceTypes: { OnOffLight: 'light', OnOffOutlet: 'outlet' },
            registerPlatformAccessories: async (_plugin, _platform, accessories) => registered.push(...accessories),
            unregisterPlatformAccessories: async () => {},
            updateAccessoryState: async (uuid, cluster, state) => updates.push({ uuid, cluster, state }),
        },
    };
    const bridge = new MatterBridge(
        api,
        { info() {}, warn() {} },
        { ipaddress: '192.168.1.10', port: 20000 },
        [relay],
        { getRelayState() {} },
        [],
    );

    await bridge.start();
    assert.equal(registered.length, 1);
    assert.equal(registered[0].deviceType, 'light');
    await registered[0].handlers.onOff.on();
    assert.deepEqual(commands, [true]);

    bridge.syncRelay(relay);
    await new Promise(resolve => setImmediate(resolve));
    assert.equal(updates.at(-1).state.onOff, true);
});

test('ignores group relay addresses for Matter registration', async () => {
    let registered = false;
    const api = {
        hap: { uuid: { generate: value => value } },
        matter: {
            deviceTypes: { OnOffLight: 'light', OnOffOutlet: 'outlet' },
            registerPlatformAccessories: async () => { registered = true; },
            unregisterPlatformAccessories: async () => {},
        },
    };
    const bridge = new MatterBridge(
        api,
        { info() {}, warn() {} },
        { ipaddress: '192.168.1.10', port: 20000 },
        [{ name: 'All lights', address: '0/1/0', power: false, config: { accessory: 'MHRelay' } }],
        { getRelayState() {} },
        [],
    );

    await bridge.start();
    assert.equal(registered, false);
});
