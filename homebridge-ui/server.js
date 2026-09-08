'use strict';
const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
const { spawn } = require('node:child_process');
const ConfigStore = require('./config-store');
class UiServer extends HomebridgePluginUiServer {
    constructor() {
        super();
        const store = new ConfigStore(this.homebridgeConfigPath);
        const handle = fn => payload => {
            try { return fn(payload); }
            catch (error) { throw new RequestError(error.message); }
        };
        this.onRequest('/myhome/config', handle(() => store.read()));
        this.onRequest('/myhome/save', handle(payload => store.save(payload)));
        this.onRequest('/myhome/restart', handle(() => {
            const timer = setTimeout(() => {
                const executable = process.platform === 'win32' ? 'hb-service.cmd' : 'hb-service';
                const child = spawn(executable, ['restart'], { detached: true, stdio: 'ignore' });
                child.on('error', error => console.error('[MyHome UI] Restart failed:', error.message));
                child.unref();
            }, 500);
            timer.unref();
            return { restarting: true };
        }));
        this.ready();
    }
}
new UiServer();
