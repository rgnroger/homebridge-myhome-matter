'use strict';

const assert = require('node:assert/strict');
const test = require('node:test');
const { normalizeVisualConfig } = require('../lib/config');
const fs = require('node:fs');
const path = require('node:path');

test('ignora linhas vazias criadas pela interface de configuração', () => {
    const config = normalizeVisualConfig({
        host: '192.168.0.23',
        advancedBlinds: [{ bus: 0 }, {}],
        auxContacts: [{}, { name: 'Sem canal' }, { name: '', channel: 1 }],
    });

    assert.deepEqual(config.devices, []);
});

test('converte contatos secos 3477 em sensores WHO 25 abertos e fechados', () => {
    const config = normalizeVisualConfig({
        host: '192.168.0.35',
        auxContacts: [
            { name: 'PORTA', channel: 1 },
            { name: 'PORTÃO', channel: 2, invert: true },
            { name: 'Canal inválido', channel: 9 },
        ],
    });

    assert.deepEqual(config.devices, [
        { accessory: 'MHDryContact', name: 'PORTA', address: 1, type: 'Contact', visualDryContact: true, invert: false },
        { accessory: 'MHDryContact', name: 'PORTÃO', address: 2, type: 'Contact', visualDryContact: true, invert: true },
    ]);
});

test('contatos visuais do 3477 dispensam o fakegato-history', () => {
    const source = fs.readFileSync(path.join(__dirname, '..', 'index.js'), 'utf8');
    const visualBranch = source.indexOf('if (this.visualDryContact)');
    const fakeGatoBranch = source.indexOf("if (this.config.storage == 'fs')", visualBranch);

    assert.notEqual(visualBranch, -1);
    assert.ok(fakeGatoBranch > visualBranch);
    assert.match(source.slice(visualBranch, fakeGatoBranch), /return \[service, this\.dryContactService\]/);
});

test('converte um comando 4680 CEN+ nos quatro botões programáveis', () => {
    const config = normalizeVisualConfig({
        host: '192.168.0.35',
        cenPlusControls: [{
            name: 'CENÁRIO GARAGEM',
            cen: 1,
            button1: 'CHEGAR',
            button4: 'SAIR',
        }],
    });

    assert.deepEqual(config.devices, [
        { accessory: 'MHCenPlusButton', name: 'CHEGAR', address: 1, button: 1 },
        { accessory: 'MHCenPlusButton', name: 'CENÁRIO GARAGEM BT2', address: 1, button: 2 },
        { accessory: 'MHCenPlusButton', name: 'CENÁRIO GARAGEM BT3', address: 1, button: 3 },
        { accessory: 'MHCenPlusButton', name: 'SAIR', address: 1, button: 4 },
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
