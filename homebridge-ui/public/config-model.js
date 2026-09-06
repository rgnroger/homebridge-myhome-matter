(function (root) {
    'use strict';
    const HAP = 'LegrandMyHome', MATTER = 'LegrandMyHomeMatter';
    const clone = value => JSON.parse(JSON.stringify(value));
    function load(config) {
        const blocks = clone(config);
        if (!Array.isArray(blocks)) throw new Error('A configuração deve ser uma lista de plataformas.');
        if (!blocks.some(p => p.platform === HAP)) blocks.push({ platform: HAP, name: 'MyHome', ipaddress: '', port: 20000, devices: [] });
        const companions = blocks.filter(p => p.platform === MATTER);
        if (companions.length > 1) throw new Error('Há várias plataformas Matter. Use o JSON para revisar a configuração antes de usar a tela.');
        const companion = companions[0];
        if (companion && companion.enabled === false) {
            for (const p of blocks.filter(p => p.platform === HAP)) {
                for (const d of p.devices || []) d.matter = false;
            }
        }
        if (companion && companion.mode !== 'configured') {
            const matches = [];
            for (const p of blocks.filter(p => p.platform === HAP)) {
                for (const d of p.devices || []) {
                    if (d.accessory === 'MHRelay' && d.address === companion.address && (!companion.ipaddress || p.ipaddress === companion.ipaddress)) matches.push(d);
                }
            }
            if (matches.length > 1) throw new Error('O endereço Matter antigo é ambíguo. Defina ipaddress no JSON.');
            if (matches.length === 1 && companion.enabled !== false) matches[0].matter = true;
        }
        return blocks;
    }
    function validate(blocks) {
        if (!Array.isArray(blocks)) throw new Error('Use uma lista de plataformas no JSON.');
        for (const p of blocks.filter(p => p.platform === HAP)) {
            if (typeof p.ipaddress !== 'string' || !p.ipaddress.trim()) throw new Error('Preencha o endereço do gateway.');
            if (p.port !== undefined && (!Number.isInteger(p.port) || p.port < 1 || p.port > 65535)) throw new Error('Porta inválida.');
            if (!Array.isArray(p.devices)) throw new Error('Dispositivos deve ser uma lista.');
            const addresses = new Set();
            for (const d of p.devices) {
                if (!d.name || !d.accessory) throw new Error('Cada dispositivo precisa de nome e tipo.');
                if (['MHRelay', 'MHDimmer'].includes(d.accessory)) {
                    if (typeof d.address !== 'string' || !/^\d+\/\d+\/\d+$/.test(d.address) || Number(d.address.split('/')[2]) === 0) throw new Error('Luz: use barramento/área/ponto, por exemplo 0/0/3. O ponto deve ser maior que zero.');
                    const normalized = d.address.split('/').map(Number).join('/');
                    if (addresses.has(normalized)) throw new Error('Há dois relés com o mesmo endereço: ' + d.address);
                    addresses.add(normalized);
                }
                if (d.matter === true && d.accessory !== 'MHRelay') throw new Error('Matter está disponível somente para MHRelay nesta versão.');
                if (d.matter === true && p._bridge) throw new Error('Para Matter, o gateway e a plataforma complementar precisam estar na ponte principal. A tela não move child bridges automaticamente.');
            }
        }
        return blocks;
    }
    function prepare(blocks) {
        const out = validate(clone(blocks));
        const hasMatter = out.some(p => p.platform === HAP && p.devices.some(d => d.matter === true));
        let companion = out.find(p => p.platform === MATTER);
        if (hasMatter && companion && companion._bridge) throw new Error('A plataforma Matter está em uma child bridge. Revise sua localização no JSON.');
        if (hasMatter && !companion) {
            companion = { platform: MATTER, name: 'MyHome Matter' };
            out.push(companion);
        }
        if (companion) {
            companion.mode = 'configured';
            // Keep an empty companion so cached accessories can be removed on restart.
            companion.enabled = true;
            delete companion.address;
            delete companion.ipaddress;
        }
        return out;
    }
    const api = { HAP, MATTER, clone, load, validate, prepare };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.MyHomeConfig = api;
})(typeof window === 'undefined' ? this : window);
