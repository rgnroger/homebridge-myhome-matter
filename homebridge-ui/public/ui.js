/* global MyHomeConfig */
'use strict';
(async function () {
    const M = MyHomeConfig, hb = window.homebridge;
    const el = id => document.getElementById(id);
    let blocks, selected = 0, rawMode = false, queue = Promise.resolve(), lastError = false, revision = 0;
    const gateways = () => blocks.filter(p => p.platform === M.HAP);
    const current = () => gateways()[selected];
    function message(text, error = false) { el('message').textContent = text; el('message').className = error ? 'error' : ''; }
    function schedule() {
        const request = ++revision;
        try {
            const prepared = M.prepare(blocks);
            hb.disableSaveButton();
            lastError = false;
            queue = queue.catch(() => {}).then(() => hb.updatePluginConfig(prepared)).then(() => {
                if (!lastError && request === revision && !rawMode) hb.enableSaveButton();
            }).catch(error => { lastError = true; hb.disableSaveButton(); message(error.message, true); });
            message('Alterações prontas. Salve e reinicie o Homebridge para aplicar.');
        } catch (error) { lastError = true; hb.disableSaveButton(); message(error.message, true); }
    }
    function input(label, value, change, type = 'text') {
        const wrap = document.createElement('label'); wrap.textContent = label;
        const field = document.createElement('input'); field.type = type; field.className = 'form-control'; field.value = value ?? '';
        field.addEventListener('input', () => { change(field.value); schedule(); });
        wrap.append(field); return wrap;
    }
    function render() {
        const list = gateways();
        el('gateway').replaceChildren(...list.map((p, i) => { const option = document.createElement('option'); option.value = i; option.textContent = p.name || p.ipaddress || 'Novo gateway'; return option; }));
        el('gateway').value = selected;
        const p = current(); p.devices ||= [];
        for (const [id, key, fallback] of [['gateway-name','name',''],['host','ipaddress',''],['port','port',20000],['password','ownpassword','']]) {
            el(id).value = p[key] ?? fallback;
            el(id).oninput = () => { p[key] = id === 'port' ? Number(el(id).value) : el(id).value; schedule(); };
        }
        el('devices').replaceChildren();
        if (!p.devices.length) { const empty = document.createElement('p'); empty.className = 'empty'; empty.textContent = 'Nenhum dispositivo. Adicione seu primeiro relé.'; el('devices').append(empty); }
        p.devices.forEach((d, index) => {
            const card = document.createElement('article'); card.className = 'device';
            const head = document.createElement('div'); head.className = 'device-head';
            const title = document.createElement('h4'); title.textContent = d.name || 'Novo relé';
            const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'btn btn-outline-danger btn-sm'; remove.textContent = 'Remover'; remove.setAttribute('aria-label', 'Remover ' + (d.name || 'relé'));
            remove.onclick = () => { p.devices.splice(index, 1); render(); schedule(); };
            head.append(title, remove); card.append(head);
            const fields = document.createElement('div'); fields.className = 'fields';
            fields.append(input('Nome', d.name, v => { d.name = v; title.textContent = v || 'Novo relé'; }));
            const kind = document.createElement('label'); kind.textContent = 'Tipo';
            const typeName = document.createElement('select'); typeName.className = 'form-select';
            const choices = [['MHRelay', 'Relé liga/desliga'], ['MHDimmer', 'Dimmer · HomeKit']];
            if (!choices.some(([value]) => value === d.accessory)) choices.push([d.accessory, d.accessory + ' · HomeKit']);
            for (const [value, label] of choices) { const option = document.createElement('option'); option.value = value; option.textContent = label; typeName.append(option); }
            typeName.value = d.accessory;
            typeName.onchange = () => { d.accessory = typeName.value; if (d.accessory !== 'MHRelay') d.matter = false; render(); schedule(); };
            kind.append(typeName); fields.append(kind);
            let advanced;
            if (['MHRelay', 'MHDimmer'].includes(d.accessory) || /^\d+\/\d+\/\d+$/.test(d.address || '')) {
                // Keep the original strings (including leading zeros) until edited.
                const parts = d.address ? d.address.split('/') : ['0', '0', ''];
                while (parts.length < 3) parts.push('');
                function addressField(label, part, minimum) {
                    const control = input(label, parts[part], value => {
                        parts[part] = value;
                        d.address = parts.join('/');
                    }, 'number');
                    const field = control.querySelector('input');
                    field.min = String(minimum); field.step = '1';
                    return control;
                }
                fields.append(addressField('A', 1, 0), addressField('PL', 2, 1));
                advanced = document.createElement('details'); advanced.className = 'address-advanced';
                const summary = document.createElement('summary'); summary.textContent = 'Avançado · barramento ' + parts[0];
                advanced.append(summary, addressField('Barramento', 0, 0));
                advanced.addEventListener('input', () => { summary.textContent = 'Avançado · barramento ' + parts[0]; });
            } else {
                fields.append(input('Endereço', d.address, v => { d.address = v; }));
            }
            card.append(fields);
            if (advanced) card.append(advanced);
            const toggle = document.createElement('label'); toggle.className = 'matter-option';
            const check = document.createElement('input'); check.type = 'checkbox'; check.checked = d.matter === true; check.disabled = d.accessory !== 'MHRelay';
            check.onchange = () => { d.matter = check.checked; schedule(); };
            toggle.append(check, document.createTextNode('Publicar também no Matter (Alexa e outros controladores)')); card.append(toggle);
            if (d.accessory !== 'MHRelay') { const note = document.createElement('p'); note.textContent = d.accessory === 'MHDimmer' ? 'Controle de brilho pelo HomeKit. Suporte Matter para dimmers ainda não disponível nesta versão.' : 'Dispositivo existente preservado. Opções específicas podem ser editadas na aba JSON.'; card.append(note); }
            el('devices').append(card);
        });
        hb.fixScrollHeight();
    }
    try {
        blocks = M.load(await hb.getPluginConfig());
        render();
        // Do not migrate or save existing config merely by opening the editor.
        hb.disableSaveButton();
        el('gateway').onchange = () => { selected = Number(el('gateway').value); render(); };
        el('add').onclick = () => { current().devices.push({ accessory: 'MHRelay', name: '', address: '', matter: false }); render(); schedule(); };
        el('add-gateway').onclick = () => { blocks.push({ platform: M.HAP, name: 'MyHome', ipaddress: '', port: 20000, devices: [] }); selected = gateways().length - 1; render(); schedule(); };
        el('json').onclick = () => { rawMode = true; revision++; el('raw').value = JSON.stringify(blocks, null, 2); el('visual-panel').hidden = true; el('json-panel').hidden = false; hb.disableSaveButton(); hb.fixScrollHeight(); };
        el('raw').oninput = () => { revision++; hb.disableSaveButton(); };
        function applyJson() { blocks = M.load(JSON.parse(el('raw').value)); selected = 0; render(); schedule(); }
        el('apply-json').onclick = () => { try { applyJson(); } catch (error) { lastError = true; message(error.message, true); } };
        el('visual').onclick = () => {
            if (rawMode) { try { applyJson(); } catch (error) { message(error.message, true); return; } }
            rawMode = false; el('visual-panel').hidden = false; el('json-panel').hidden = true; hb.fixScrollHeight();
        };
        el('save').onclick = async () => {
            el('save').disabled = true;
            try {
                if (rawMode) applyJson(); else schedule();
                await queue;
                if (lastError) return;
                await hb.savePluginConfig();
                message('Configuração salva. Reinicie o Homebridge para aplicar.');
            } catch (error) { message(error.message, true); }
            finally { el('save').disabled = false; }
        };
    } catch (error) { hb.disableSaveButton(); message(error.message, true); el('save').disabled = true; }
})();
