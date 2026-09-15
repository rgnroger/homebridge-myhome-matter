'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeVisualConfig } = require('../lib/config');

test('ignora linhas vazias criadas pela interface de configuração', () => {
    const config = normalizeVisualConfig({
        host: '192.168.0.23',
        advancedBlinds: [{ bus: 0 }, {}],
        auxContacts: [{}, { name: 'Sem canal' }, { name: '', channel: 1 }],
    });

    assert.deepEqual(config.devices, []);
});

test('converte contatos secos 3477 em entradas AUX abertas e fechadas', () => {
    const config = normalizeVisualConfig({
        host: '192.168.0.35',
        auxContacts: [
            { name: 'PORTA', channel: 1 },
            { name: 'PORTÃO', channel: 2, invert: true },
            { name: 'Canal inválido', channel: 9 },
        ],
    });

    assert.deepEqual(config.devices, [
        { accessory: 'MHAux', name: 'PORTA', address: 1, type: 'Contact', auxContact: true, invert: false },
        { accessory: 'MHAux', name: 'PORTÃO', address: 2, type: 'Contact', auxContact: true, invert: true },
    ]);
});

test('mantém somente acessórios que possuem nome, área e ponto', () => {
    const config = normalizeVisualConfig({
        host: '192.168.0.23',
        lights: [
            { name: 'PLAFON', area: 1, point: 1, bus: 0 },
            { name: '', area: 1, point: 2, bus: 0 },
            { name: 'Sem ponto', area: 1, bus: 0 },
        ],
        blinds: [
            { name: 'TECIDO', area: 1, point: 3, bus: 0, travelTime: 30, invert: true },
        ],
    });

    assert.deepEqual(config.devices, [
        { accessory: 'MHRelay', name: 'PLAFON', address: '0/1/1' },
        { accessory: 'MHBlind', name: 'TECIDO', address: '0/1/3', time: 30, invert: true },
    ]);
});
