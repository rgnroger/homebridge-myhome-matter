'use strict';

const assert = require('node:assert/strict');
const net = require('node:net');
const test = require('node:test');
const { ACK, MockOpenWebNetGateway } = require('../tools/mock-openwebnet-gateway');

function connectFrames(port) {
  const socket = net.connect({ host: '127.0.0.1', port });
  socket.setEncoding('utf8');
  let buffer = '';
  const frames = [];
  const waiters = [];

  socket.on('data', (chunk) => {
    buffer += chunk;
    let terminator;
    while ((terminator = buffer.indexOf('##')) >= 0) {
      const frame = buffer.slice(0, terminator + 2);
      buffer = buffer.slice(terminator + 2);
      const waiter = waiters.shift();
      if (waiter) {
        waiter.resolve(frame);
      } else {
        frames.push(frame);
      }
    }
  });

  function nextFrame(timeoutMs = 1000) {
    if (frames.length > 0) {
      return Promise.resolve(frames.shift());
    }

    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject };
      waiters.push(waiter);
      const timer = setTimeout(() => {
        const position = waiters.indexOf(waiter);
        if (position >= 0) waiters.splice(position, 1);
        reject(new Error('Tempo esgotado aguardando frame OpenWebNet'));
      }, timeoutMs);
      waiter.resolve = (frame) => {
        clearTimeout(timer);
        resolve(frame);
      };
    });
  }

  return { socket, nextFrame };
}

test('simula sessões COMMAND e MONITOR com feedback de relé', async (t) => {
  const gateway = new MockOpenWebNetGateway({ port: 0, logger: { log() {} } });
  const { port } = await gateway.start();
  t.after(() => gateway.stop());

  const command = connectFrames(port);
  const monitor = connectFrames(port);
  t.after(() => command.socket.destroy());
  t.after(() => monitor.socket.destroy());

  assert.equal(await command.nextFrame(), ACK);
  assert.equal(await monitor.nextFrame(), ACK);

  command.socket.write('*99*0##');
  monitor.socket.write('*99*1##');
  assert.equal(await command.nextFrame(), ACK);
  assert.equal(await monitor.nextFrame(), ACK);

  command.socket.write('*1*1*01##');
  assert.equal(await command.nextFrame(), ACK);
  assert.equal(await monitor.nextFrame(), '*1*1*01##');
  assert.equal(gateway.states.get('01'), 1);
});

test('aceita frames fragmentados como uma conexão TCP real', async (t) => {
  const gateway = new MockOpenWebNetGateway({ port: 0, logger: { log() {} } });
  const { port } = await gateway.start();
  t.after(() => gateway.stop());

  const command = connectFrames(port);
  t.after(() => command.socket.destroy());

  assert.equal(await command.nextFrame(), ACK);
  command.socket.write('*99*');
  command.socket.write('0##');
  assert.equal(await command.nextFrame(), ACK);
});
