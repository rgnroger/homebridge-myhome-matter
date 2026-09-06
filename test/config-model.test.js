const { test } = require('node:test');
const assert = require('node:assert/strict');
const M = require('../homebridge-ui/public/config-model');
const original = () => [
    { platform: M.HAP, ipaddress: '192.0.2.1', ownpassword: 'example', setclock: true,
        custom: { keep: true }, devices: [
            { accessory: 'MHRelay', name: 'EMBUTIDO 1', address: '0/0/3', frame_on: '*1*1*3##', pul: false },
            { accessory: 'MHBlind', name: 'Persiana', address: '0/1/2', time: 28 },
        ] },
    { platform: M.MATTER, name: 'MyHome Matter Test', address: '0/0/3', enabled: true },
];

test('migrates legacy selection without mutating input or losing advanced fields', () => {
    const input = original();
    const snapshot = M.clone(input);
    const result = M.prepare(M.load(input));
    assert.deepEqual(input, snapshot);
    assert.equal(result[0].devices[0].matter, true);
    assert.equal(result[0].devices[0].frame_on, '*1*1*3##');
    assert.deepEqual(result[0].devices[1], input[0].devices[1]);
    assert.deepEqual(result[0].custom, { keep: true });
    assert.equal(result[1].mode, 'configured');
    assert.equal(result[1].address, undefined);
});
test('accepts area zero and arbitrary individual points, rejects duplicates and point zero', () => {
    const c = M.load(original());
    c[0].devices.push({ name: 'Abajur', accessory: 'MHRelay', address: '0/0/9', matter: true });
    assert.doesNotThrow(() => M.prepare(c));
    c[0].devices[2].address = '0/0/03';
    assert.throws(() => M.prepare(c), /mesmo endereço/);
    c[0].devices[2].address = '0/0/0';
    assert.throws(() => M.prepare(c), /ponto/);
});
test('removing all selections retains cleanup platform and preserves HAP', () => {
    const c = M.load(original());
    c[0].devices[0].matter = false;
    const result = M.prepare(c);
    assert.equal(result[0].devices.length, 2);
    assert.equal(result[1].mode, 'configured');
    assert.equal(result[1].enabled, true);
});
test('does not re-enable previously disabled legacy or configured devices', () => {
    for (const mode of [undefined, 'configured']) {
        const c = original(); c[1].mode = mode; c[1].enabled = false; c[0].devices[0].matter = true;
        assert.equal(M.load(c)[0].devices[0].matter, false);
    }
});
test('new Matter selection creates one companion and preserves unrelated blocks', () => {
    const c = original().slice(0,1); c.push({ platform: 'Other', custom: 42 });
    c[0].devices[0].matter = true;
    const result = M.prepare(c);
    assert.deepEqual(result[1], c[1]);
    assert.equal(result.filter(p => p.platform === M.MATTER).length, 1);
});
test('prevents unsupported Matter types and accidental child bridge migration', () => {
    const c = M.load(original()); c[0].devices[1].matter = true;
    assert.throws(() => M.prepare(c), /somente/);
    c[0].devices[1].matter = false; c[0]._bridge = { username: 'AA:BB' };
    assert.throws(() => M.prepare(c), /ponte principal/);
});
