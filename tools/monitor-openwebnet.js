'use strict';

const { MyHomeClient } = require('../lib/mhclient');

function usage() {
  console.log('Uso: node tools/monitor-openwebnet.js <ip> [porta] [senha]');
  console.log('Exemplo: node tools/monitor-openwebnet.js 192.168.0.23 20000 12345');
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
    console.log(`[conectado] Gateway ${host}:${port}`);
    console.log('Acione agora os contatos do 3477. Pressione Ctrl+C para encerrar.');
  },
  onMonitor(frame) {
    received++;
    console.log(`[${new Date().toLocaleTimeString('pt-BR')}] RX ${frame}##`);
  },
};

const client = new MyHomeClient(host, port, password, false, parent);
client.start();

const connectionTimeout = setTimeout(() => {
  if (!client.command?.isConnected || !client.monitor?.isConnected) {
    console.error(`[aviso] Ainda não conectou a ${host}:${port}. Confira IP, porta e senha.`);
  }
}, 10000);

function shutdown() {
  clearTimeout(connectionTimeout);
  client.stop();
  console.log(`Monitor encerrado. Frames recebidos: ${received}.`);
  process.exit(0);
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
