/* global MyHomeConfig */
'use strict';
(async function () {
    const M = MyHomeConfig, hb = window.homebridge;
    const el = id => document.getElementById(id);
    let blocks, diskRevision, selected = 0, rawMode = false, queue = Promise.resolve(), lastError = false, revision = 0;
    const gateways = () => blocks.filter(p => p.platform === M.HAP);
    const current = () => gateways()[selected];
    function message(text, error = false) { el('message').textContent = text; el('message').className = error ? 'error' : ''; }
    function schedule() {
        const request = ++revision;
        try {
            M.prepare(blocks);
            hb.disableSaveButton();
            lastError = false;
            // The host only handles one platform alias. Our server saves both aliases together.
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
            const kind = document.createElement('div'); kind.className = 'kind';
            const kindLabel = document.createElement('span'); kindLabel.textContent = 'Tipo';
            const typeName = document.createElement('div'); typeName.className = 'type-buttons';
            const choices = [['MHRelay', 'Relé liga/desliga'], ['MHDimmer', 'Dimmer · HomeKit'], ['MHBlind', 'Persiana · HomeKit'], ['MHBlindAdvanced', 'Persiana avançada · HomeKit']];
            if (!choices.some(([value]) => value === d.accessory)) choices.push([d.accessory, 'Manter ' + d.accessory]);
            for (const [value, label] of choices) {
                const button = document.createElement('button'); button.type = 'button'; button.textContent = label;
                button.className = 'btn btn-sm ' + (d.accessory === value ? 'btn-primary' : 'btn-outline-secondary');
                button.onclick = () => { d.accessory = value; if (value !== 'MHRelay') d.matter = false; render(); schedule(); };
                typeName.append(button);
            }
            kind.append(kindLabel, typeName); fields.append(kind);
            let advanced;
            if (['MHRelay', 'MHDimmer', 'MHBlind', 'MHBlindAdvanced'].includes(d.accessory) || /^\d+\/\d+\/\d+$/.test(d.address || '')) {
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
            if (d.accessory === 'MHBlind') fields.append(input('Tempo de percurso (segundos)', d.time, value => { d.time = Number(value); }, 'number'));
            card.append(fields);
            if (advanced) card.append(advanced);
            const toggle = document.createElement('label'); toggle.className = 'matter-option';
            const check = document.createElement('input'); check.type = 'checkbox'; check.checked = d.matter === true; check.disabled = d.accessory !== 'MHRelay';
            check.onchange = () => { d.matter = check.checked; schedule(); };
            toggle.append(check, document.createTextNode('Publicar também no Matter (Alexa e outros controladores)')); card.append(toggle);
            if (d.accessory !== 'MHRelay') {
                const note = document.createElement('p');
                note.textContent = d.accessory === 'MHDimmer' ? 'Controle de brilho pelo HomeKit. Matter ainda não disponível para dimmers.' :
                    d.accessory === 'MHBlind' ? 'Controle pelo HomeKit. Informe o tempo real de percurso completo.' :
                    d.accessory === 'MHBlindAdvanced' ? 'Controle pelo HomeKit. Requer atuador com suporte a posição avançada.' :
                    'Opções específicas podem ser editadas na aba JSON.';
                card.append(note);
            }
            el('devices').append(card);
        });
        hb.fixScrollHeight();
    }
    try {
        const saved = await hb.request('/myhome/config');
        diskRevision = saved.revision;
        blocks = M.load(saved.blocks);
        render();
        // Do not migrate or save existing config merely by opening the editor.
        hb.disableSaveButton();
        el('gateway').onchange = () => { selected = Number(el('gateway').value); render(); };
        el('add').onclick = () => {
            current().devices.unshift({ accessory: 'MHRelay', name: '', address: '', matter: false });
            render(); schedule();
            const first = el('devices').querySelector('.device');
            first?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            first?.querySelector('input')?.focus();
        };
        el('add-gateway').onclick = () => { blocks.push({ platform: M.HAP, name: 'MyHome', ipaddress: '', port: 20000, devices: [] }); selected = gateways().length - 1; render(); schedule(); };
        el('json').onclick = () => { rawMode = true; revision++; el('raw').value = JSON.stringify(blocks, null, 2); el('visual-panel').hidden = true; el('json-panel').hidden = false; hb.disableSaveButton(); hb.fixScrollHeight(); };
        el('raw').oninput = () => { revision++; hb.disableSaveButton(); };
        function applyJson() { blocks = M.load(JSON.parse(el('raw').value)); selected = 0; render(); schedule(); }
        el('apply-json').onclick = () => { try { applyJson(); } catch (error) { lastError = true; message(error.message, true); } };
        el('visual').onclick = () => {
            if (rawMode) { try { applyJson(); } catch (error) { message(error.message, true); return; } }
            rawMode = false; el('visual-panel').hidden = false; el('json-panel').hidden = true; hb.fixScrollHeight();
        };
        async function saveAndRestart() {
            const buttons = [...document.querySelectorAll('.save-restart')];
            buttons.forEach(button => { button.disabled = true; });
            try {
                if (rawMode) applyJson(); else schedule();
                await queue;
                if (lastError) return;
                const saved = await hb.request('/myhome/save', { blocks: M.prepare(blocks), revision: diskRevision });
                diskRevision = saved.revision;
                message('Configuração salva. Escolha se deseja reiniciar agora.');
                el('restart-dialog').hidden = false;
                el('restart-now').focus();
            } catch (error) { message(error.message, true); }
            finally { buttons.forEach(button => { button.disabled = false; }); }
        }
        el('save-restart-top').onclick = saveAndRestart;
        el('save-restart-bottom').onclick = saveAndRestart;
        el('restart-later').onclick = () => { el('restart-dialog').hidden = true; };
        el('restart-now').onclick = async () => {
            el('restart-now').disabled = true;
            el('restart-later').disabled = true;
            message('Reiniciando o Homebridge…');
            try { await hb.request('/myhome/restart'); }
            catch (error) {
                message('Não foi possível reiniciar: ' + error.message, true);
                el('restart-dialog').hidden = true;
                el('restart-now').disabled = false;
                el('restart-later').disabled = false;
            }
        };
    } catch (error) { hb.disableSaveButton(); message(error.message, true); document.querySelectorAll('.save-restart').forEach(button => { button.disabled = true; }); }
})();
