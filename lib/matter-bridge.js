'use strict';

const PLUGIN = 'homebridge-myhome-matter';
const PLATFORM = 'MyHomeMatter';

class MatterBridge {
    constructor(api, log, config, devices, controller, cachedAccessories) {
        this.api = api;
        this.log = log;
        this.config = config;
        this.devices = devices;
        this.controller = controller;
        this.cachedAccessories = cachedAccessories;
        this.bindings = new Map();
        this.stopped = false;
    }

    async start() {
        const matter = this.api && this.api.matter;
        if (!matter) {
            this.log.info('[Matter] Matter is not enabled for this bridge; HomeKit remains active.');
            return;
        }

        const relays = this.devices.filter(device =>
            (device.config.accessory === 'MHRelay' || device.config.accessory === 'MHOutlet')
            && /^\d+\/\d+\/[1-9]\d*$/.test(device.address));
        const uuids = new Set(relays.map(relay => this.uuid(relay)));
        const stale = this.cachedAccessories.filter(accessory => !uuids.has(accessory.UUID));
        if (stale.length) await matter.unregisterPlatformAccessories(PLUGIN, PLATFORM, stale);

        for (const relay of relays) {
            if (this.stopped) return;
            const uuid = this.uuid(relay);
            const accessory = {
                UUID: uuid,
                displayName: relay.name,
                deviceType: relay.config.accessory === 'MHOutlet'
                    ? matter.deviceTypes.OnOffOutlet
                    : matter.deviceTypes.OnOffLight,
                manufacturer: 'BTicino / Legrand',
                model: relay.config.accessory === 'MHOutlet' ? 'MyHome Outlet' : 'MyHome Relay',
                serialNumber: uuid.replace(/-/g, ''),
                clusters: { onOff: { onOff: Boolean(relay.power) } },
                handlers: {
                    onOff: {
                        on: async () => relay.setPower(true),
                        off: async () => relay.setPower(false),
                        toggle: async () => relay.setPower(!relay.power),
                    },
                },
            };
            await matter.registerPlatformAccessories(PLUGIN, PLATFORM, [accessory]);
            this.bindings.set(relay, uuid);
            this.controller.getRelayState(relay.address);
            this.log.info(`[Matter] Registered ${relay.name} (${relay.address})`);
        }
    }

    uuid(relay) {
        const gateway = `${this.config.ipaddress}:${this.config.port || 20000}`;
        return this.api.hap.uuid.generate(`${PLUGIN}:${gateway}:${relay.address}`);
    }

    syncRelay(relay) {
        const uuid = this.bindings.get(relay);
        if (!uuid || this.stopped || !this.api.matter) return;
        this.api.matter.updateAccessoryState(uuid, 'onOff', { onOff: Boolean(relay.power) })
            .catch(error => this.log.warn(`[Matter] State update failed for ${relay.address}: ${error.message}`));
    }

    syncRelays() {
        for (const relay of this.bindings.keys()) this.syncRelay(relay);
    }

    stop() {
        this.stopped = true;
        this.bindings.clear();
    }
}

module.exports = MatterBridge;
