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
            // Return to the browser before restarting the service that owns this UI process.
            const timer = setTimeout(() => {
                const child = spawn('hb-service', ['restart'], { detached: true, stdio: 'ignore' });
                child.on('error', error => console.error('[MyHome UI] Homebridge restart failed:', error.message));
                child.unref();
            }, 500);
            timer.unref();
            return { restarting: true };
        }));
        this.ready();
    }
}
new UiServer();
