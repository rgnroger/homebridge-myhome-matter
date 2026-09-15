'use strict';

const { MyHomeClient } = require('../lib/mhclient');

function usage() {
  console.log('Usage: node tools/monitor-openwebnet.js <ip> [port] [password]');
  console.log('Example: node tools/monitor-openwebnet.js 192.168.1.10 20000 YOUR_PASSWORD');
}

const host = process.argv[2];
const port = Number(process.argv[3] || 20000);
const password = process.argv[4] || '';

if (!host || !Number.isInteger(port) || port < 1 || port > 65535) {
  usage();
  process.exit(1);
}

let received = 0;
const parent = {
  onConnect() {
    console.log(`[connected] Gateway ${host}:${port}`);
    console.log('Operate the 3477 contacts or CEN+ controls now. Press Ctrl+C to stop.');
  },
  onMonitor(frame) {
    received++;
    console.log(`[${new Date().toLocaleTimeString('en-US')}] RX ${frame}##`);
  },
};

const client = new MyHomeClient(host, port, password, false, parent);
client.start();

const connectionTimeout = setTimeout(() => {
  if (!client.command?.isConnected || !client.monitor?.isConnected) {
    console.error(`[warning] Not connected to ${host}:${port}. Check the IP address, port, and password.`);
  }
}, 10000);

function shutdown() {
  clearTimeout(connectionTimeout);
  client.stop();
  console.log(`Monitor stopped. Frames received: ${received}.`);
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
