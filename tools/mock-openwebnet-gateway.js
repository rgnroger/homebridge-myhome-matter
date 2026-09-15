'use strict';

const net = require('node:net');

const ACK = '*#*1##';

class MockOpenWebNetGateway {
  constructor(options = {}) {
    this.host = options.host || '127.0.0.1';
    this.port = Number(options.port ?? 20001);
    this.logger = options.logger || console;
    this.server = null;
    this.sockets = new Set();
    this.monitorSockets = new Set();
    this.states = new Map();
    this.blindStates = new Map();
  }

  async start() {
    if (this.server) {
      return this.address();
    }

    this.server = net.createServer((socket) => this.handleConnection(socket));

    await new Promise((resolve, reject) => {
      this.server.once('error', reject);
      this.server.listen(this.port, this.host, () => {
        this.server.off('error', reject);
        resolve();
      });
    });

    return this.address();
  }

  address() {
    const address = this.server && this.server.address();
    return typeof address === 'object' && address
      ? { host: this.host, port: address.port }
      : { host: this.host, port: this.port };
  }

  handleConnection(socket) {
    socket.setEncoding('utf8');
    socket.openwebnetBuffer = '';
    socket.openwebnetRole = 'UNKNOWN';
    this.sockets.add(socket);

    socket.on('data', (chunk) => {
      socket.openwebnetBuffer += chunk;
      this.extractFrames(socket);
    });

    socket.on('close', () => {
      this.sockets.delete(socket);
      this.monitorSockets.delete(socket);
    });

    socket.on('error', () => {
      // The close event performs all cleanup needed by the simulator.
    });

    socket.write(ACK);
  }

  extractFrames(socket) {
    let terminator;
    while ((terminator = socket.openwebnetBuffer.indexOf('##')) >= 0) {
      const frame = socket.openwebnetBuffer.slice(0, terminator + 2).trim();
      socket.openwebnetBuffer = socket.openwebnetBuffer.slice(terminator + 2);
      if (frame) {
        this.handleFrame(socket, frame);
      }
    }
  }

  handleFrame(socket, frame) {
    this.logger.log(`[mock-openwebnet] RX ${socket.openwebnetRole}: ${frame}`);

    if (frame === '*99*0##') {
      socket.openwebnetRole = 'COMMAND';
      socket.write(ACK);
      return;
    }

    if (frame === '*99*1##') {
      socket.openwebnetRole = 'MONITOR';
      this.monitorSockets.add(socket);
      socket.write(ACK);
      return;
    }

    const relayCommand = frame.match(/^\*1\*([01])\*([0-9#]+)##$/);
    if (relayCommand) {
      const state = Number(relayCommand[1]);
      const address = relayCommand[2];
      this.states.set(address, state);
      socket.write(ACK);
      this.broadcast(`*1*${state}*${address}##`);
      return;
    }

    const blindCommand = frame.match(/^\*2\*([012])\*([0-9#]+)##$/);
    if (blindCommand) {
      const action = Number(blindCommand[1]);
      const address = blindCommand[2];
      this.blindStates.set(address, action);
      socket.write(ACK);
      this.broadcast(`*2*${action}*${address}##`);
      return;
    }

    const relayStatus = frame.match(/^\*#1\*([0-9#]+)##$/);
    if (relayStatus) {
      const address = relayStatus[1];
      socket.write(ACK);
      if (address === '0') {
        for (const [knownAddress, state] of this.states) {
          this.broadcast(`*1*${state}*${knownAddress}##`);
        }
      } else {
        this.broadcast(`*1*${this.states.get(address) || 0}*${address}##`);
      }
      return;
    }

    socket.write(ACK);
  }

  broadcast(frame) {
    for (const socket of this.monitorSockets) {
      if (!socket.destroyed) {
        this.logger.log(`[mock-openwebnet] TX MONITOR: ${frame}`);
        socket.write(frame);
      }
    }
  }

  setRelay(address, on) {
    const state = on ? 1 : 0;
    this.states.set(String(address), state);
    this.broadcast(`*1*${state}*${address}##`);
  }

  setBlind(address, action) {
    const normalizedAction = Number(action);
    if (![0, 1, 2].includes(normalizedAction)) {
      throw new RangeError('Blind action must be 0, 1, or 2');
    }
    this.blindStates.set(String(address), normalizedAction);
    this.broadcast(`*2*${normalizedAction}*${address}##`);
  }

  async stop() {
    for (const socket of this.sockets) {
      socket.destroy();
    }
    this.sockets.clear();
    this.monitorSockets.clear();

    if (!this.server) {
      return;
    }

    const server = this.server;
    this.server = null;
    await new Promise((resolve) => server.close(resolve));
  }
}

module.exports = { ACK, MockOpenWebNetGateway };

if (require.main === module) {
  const requestedPort = Number(process.env.OPENWEBNET_MOCK_PORT || 20001);
  const gateway = new MockOpenWebNetGateway({ port: requestedPort });

  gateway.start()
    .then(({ host, port }) => {
      console.log(`[mock-openwebnet] Simulated gateway listening on ${host}:${port}`);
      console.log('[mock-openwebnet] Press Ctrl+C to stop.');
    })
    .catch((error) => {
      console.error('[mock-openwebnet] Failed to start:', error);
      process.exitCode = 1;
    });

  const shutdown = async () => {
    await gateway.stop();
    process.exit(0);
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}
