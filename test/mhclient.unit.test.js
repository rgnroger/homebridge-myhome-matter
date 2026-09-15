'use strict';

const assert = require('node:assert/strict');
const Module = require('node:module');
const path = require('node:path');
const test = require('node:test');

function simpleSprintf(format, ...values) {
  let index = 0;
  return format.replace(/%(?:0(\d+))?([sd])/g, (_match, width, type) => {
    const value = values[index++];
    let output = type === 'd' ? String(Number(value)) : String(value);
    if (width) output = output.padStart(Number(width), '0');
    return output;
  });
}

function loadModuleWithoutInstalledDependencies() {
  const originalLoad = Module._load;
  Module._load = function (request, parent, isMain) {
    if (request === 'debug') return () => () => {};
    if (request === 'sprintf-js') return { sprintf: simpleSprintf };
    if (request === 'sha256') return () => '';
    if (request === 'moment') return () => ({ format: () => '' });
    return originalLoad.call(this, request, parent, isMain);
  };

  try {
    const modulePath = path.resolve(__dirname, '../lib/mhclient.js');
    delete require.cache[modulePath];
    return require(modulePath);
  } finally {
    Module._load = originalLoad;
  }
}

const { MyHomeClient } = loadModuleWithoutInstalledDependencies();

function waitFor(predicate, timeoutMs = 1500) {
  const started = Date.now();
  return new Promise((resolve, reject) => {
    const check = () => {
      if (predicate()) return resolve();
      if (Date.now() - started >= timeoutMs) {
        return reject(new Error('Tempo esgotado aguardando condição do cliente'));
      }
      setTimeout(check, 10);
    };
    check();
  });
}

test('converte endereços do Homebridge para OpenWebNet', () => {
  const client = new MyHomeClient('127.0.0.1', 20001, '', false, null);
  assert.equal(client._slashesToAddress('0/0/1'), '01');
  assert.equal(client._slashesToAddress('0/4/1'), '41');
  assert.equal(client._slashesToAddress('1/2/3'), '23#4#01');
});

test('gera um único comando para ligar e desligar o relé 01', () => {
  const client = new MyHomeClient('127.0.0.1', 20001, '', false, null);
  const sent = [];
  client.command = { send: (frame) => sent.push(frame) };

  client.relayCommand('0/0/1', true);
  client.relayCommand('0/0/1', false);

  assert.deepEqual(sent, ['*1*1*01##', '*1*0*01##']);
});

test('interpreta feedback agrupado das luzes 01 e 41', () => {
  const feedback = [];
  const parent = {
    onMonitor() {},
    onRelay: (address, state) => feedback.push({ address, state }),
  };
  const client = new MyHomeClient('127.0.0.1', 20001, '', false, parent);

  client.onMonitor('*1*1*01##*1*0*41##');

  assert.deepEqual(feedback, [
    { address: '0/0/1', state: true },
    { address: '0/4/1', state: false },
  ]);
});

test('interpreta posição e direção da persiana avançada', () => {
  const feedback = [];
  const parent = {
    onMonitor() {},
    onAdvancedBlind: (address, direction, position) => feedback.push({ address, direction, position }),
  };
  const client = new MyHomeClient('127.0.0.1', 20001, '', false, parent);

  client.onMonitor('*#2*42*10*11*50*0*0##*#2*42*10*12*25*0*0##');

  assert.deepEqual(feedback, [
    { address: '0/4/2', direction: 'UP', position: 50 },
    { address: '0/4/2', direction: 'DOWN', position: 25 },
  ]);
});

test('interpreta estados aberto e fechado dos canais AUX do 3477', () => {
  const feedback = [];
  const parent = {
    onMonitor() {},
    onAUX: (channel, state) => feedback.push({ channel, state }),
  };
  const client = new MyHomeClient('127.0.0.1', 20001, '', false, parent);

  client.onMonitor('*9*1*1##*9*0*1##*9*1*8##');

  assert.deepEqual(feedback, [
    { channel: 1, state: true },
    { channel: 1, state: false },
    { channel: 8, state: true },
  ]);
});

test('interpreta toque curto e pressão longa do 4680 CEN+', () => {
  const feedback = [];
  const parent = {
    onMonitor() {},
    onCenPlus: (address, button, event) => feedback.push({ address, button, event }),
  };
  const client = new MyHomeClient('127.0.0.1', 20001, '', false, parent);

  client.onMonitor('*25*22#1*21##*25*23#1*21##*25*23#1*21##*25*24#1*21##*25*21#1*21##');

  assert.deepEqual(feedback, [
    { address: 1, button: 1, event: 'START_EXTENDED_PRESS' },
    { address: 1, button: 1, event: 'EXTENDED_PRESS' },
    { address: 1, button: 1, event: 'EXTENDED_PRESS' },
    { address: 1, button: 1, event: 'RELEASE_EXTENDED_PRESS' },
    { address: 1, button: 1, event: 'SHORT_PRESS' },
  ]);
});

test('cliente verdadeiro conversa com o gateway simulado', async (t) => {
  const { MockOpenWebNetGateway } = require('../tools/mock-openwebnet-gateway');
  const gateway = new MockOpenWebNetGateway({ port: 0, logger: { log() {} } });
  const { port } = await gateway.start();
  const feedback = [];
  const parent = {
    onMonitor() {},
    onConnect() {},
    onRelay: (address, state) => feedback.push({ address, state }),
  };
  const client = new MyHomeClient('127.0.0.1', port, '', false, parent);
  t.after(async () => {
    client.stop();
    await gateway.stop();
  });

  client.start();
  await waitFor(() => client.command.isConnected && client.monitor.isConnected);
  client.relayCommand('0/0/1', true);
  await waitFor(() => feedback.some((item) => item.address === '0/0/1' && item.state === true));

  assert.equal(gateway.states.get('01'), 1);
});

test('PLAFON MINI 41 envia um comando e recebe feedback pelo monitor', async (t) => {
  const { MockOpenWebNetGateway } = require('../tools/mock-openwebnet-gateway');
  const gateway = new MockOpenWebNetGateway({ port: 0, logger: { log() {} } });
  const { port } = await gateway.start();
  const feedback = [];
  const parent = {
    onMonitor() {},
    onConnect() {},
    onRelay: (address, state) => feedback.push({ address, state }),
  };
  const client = new MyHomeClient('127.0.0.1', port, '', false, parent);
  t.after(async () => {
    client.stop();
    await gateway.stop();
  });

  client.start();
  await waitFor(() => client.command.isConnected && client.monitor.isConnected);
  client.relayCommand('0/4/1', true);
  await waitFor(() => feedback.some((item) => item.address === '0/4/1' && item.state === true));

  assert.equal(gateway.states.get('41'), 1);
  assert.deepEqual(feedback.filter((item) => item.address === '0/4/1'), [
    { address: '0/4/1', state: true },
  ]);
});

test('persiana comum executa PARAR antes de SUBIR e DESCER', async (t) => {
  const { MockOpenWebNetGateway } = require('../tools/mock-openwebnet-gateway');
  const gateway = new MockOpenWebNetGateway({ port: 0, logger: { log() {} } });
  const { port } = await gateway.start();
  const feedback = [];
  const parent = {
    onMonitor() {},
    onConnect() {},
    onSimpleBlind: (address, action) => feedback.push({ address, action }),
  };
  const client = new MyHomeClient('127.0.0.1', port, '', false, parent);
  t.after(async () => {
    client.stop();
    await gateway.stop();
  });

  client.start();
  await waitFor(() => client.command.isConnected && client.monitor.isConnected);

  client.simpleBlindCommand('0/4/2', 1);
  await waitFor(() => gateway.blindStates.get('42') === 1);
  client.simpleBlindCommand('0/4/2', 2);
  await waitFor(() => feedback.some((item) => item.address === '0/4/2' && item.action === 2));

  assert.deepEqual(feedback.filter((item) => item.address === '0/4/2'), [
    { address: '0/4/2', action: 0 },
    { address: '0/4/2', action: 1 },
    { address: '0/4/2', action: 0 },
    { address: '0/4/2', action: 2 },
  ]);
});
