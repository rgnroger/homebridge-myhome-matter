'use strict';
const { HomebridgePluginUiServer, RequestError } = require('@homebridge/plugin-ui-utils');
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
        this.ready();
    }
}
new UiServer();
