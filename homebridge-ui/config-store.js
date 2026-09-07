'use strict';
const fs = require('node:fs');
const { createHash, randomUUID } = require('node:crypto');
const M = require('./public/config-model');
const owns = p => p && [M.HAP, M.MATTER].includes(p.platform);
const hash = text => createHash('sha256').update(text).digest('hex');
class ConfigStore {
    constructor(path) { this.path = path; }
    read() {
        const text = fs.readFileSync(this.path, 'utf8');
        const config = JSON.parse(text);
        return { blocks: (config.platforms || []).filter(owns), revision: hash(text) };
    }
    save(payload) {
        if (!payload || !Array.isArray(payload.blocks) || payload.blocks.some(p => !owns(p))) throw new Error('Somente plataformas MyHome podem ser salvas aqui.');
        const blocks = M.prepare(payload.blocks);
        const text = fs.readFileSync(this.path, 'utf8');
        if (payload.revision !== hash(text)) throw new Error('A configuração mudou em outra janela. Feche e abra esta tela novamente.');
        const config = JSON.parse(text);
        const platforms = config.platforms || [];
        const first = platforms.findIndex(owns);
        config.platforms = platforms.filter(p => !owns(p));
        config.platforms.splice(first < 0 ? config.platforms.length : first, 0, ...blocks);
        const output = JSON.stringify(config, null, 4) + '\n';
        const temp = this.path + '.myhome-' + randomUUID();
        // Synchronous compare/write/rename prevents interleaving saves in this process.
        // A revision mismatch rejects any externally modified configuration.
        fs.writeFileSync(this.path + '.myhome-backup-' + randomUUID(), text, { mode: 0o600, flag: 'wx' });
        try {
            fs.writeFileSync(temp, output, { mode: fs.statSync(this.path).mode & 0o777, flag: 'wx' });
            if (fs.readFileSync(this.path, 'utf8') !== text) throw new Error('A configuração mudou durante o salvamento. Abra a tela novamente.');
            fs.renameSync(temp, this.path);
        } finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
        return { revision: hash(output) };
    }
}
module.exports = ConfigStore;
