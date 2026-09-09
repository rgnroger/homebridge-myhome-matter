'use strict';
const PLUGIN = 'homebridge-myhome-matter';
const PLATFORM = 'LegrandMyHomeMatter';
const platforms = new Set();

class MatterRelayPlatform {
    constructor(log, config, api) {
        this.log = log;
        this.config = config || {};
        this.api = api;
        this.cached = [];
        this.bindings = new Map();
        this.stopped = false;
        this.syncDebounce = new Map(); // Debouncing map para evitar sincronizações redundantes
        api.on('didFinishLaunching', () => {
            this.start().catch(error => log.error('[Matter] Startup failed: ' + error.message));
        });
        api.on('shutdown', () => {
            this.stopped = true;
            // Limpar timeouts pendentes
            for (const timeoutId of this.syncDebounce.values()) {
                clearTimeout(timeoutId);
            }
            this.syncDebounce.clear();
            for (const binding of this.bindings.values()) binding.ready = false;
        });
    }

    // Keep the original HAP platform static; only this companion is dynamic.
    configureAccessory() {}
    configureMatterAccessory(accessory) { this.cached.push(accessory); }

    async start() {
        const matter = this.api.matter;
        if (!matter) {
            this.log.warn('[Matter] Matter is disabled on this bridge. HAP is unaffected.');
            return;
        }
        const candidates = [];
        const configured = this.config.mode === 'configured';
        if (this.config.enabled !== false) {
            for (const platform of platforms) {
                if (this.config.ipaddress && platform.config.ipaddress !== this.config.ipaddress) continue;
                for (const relay of platform.devices) {
                    const selected = configured ? relay.config.matter === true :
                        typeof this.config.address === 'string' && relay.address === this.config.address;
                    if (!selected) continue;
                    if (relay.config.accessory !== 'MHRelay' || !/^\d+\/\d+\/\d+$/.test(relay.address) || Number(relay.address.split('/')[2]) === 0) {
                        this.log.warn('[Matter] Skipping unsupported type or non-individual relay address: ' + relay.name);
                        continue;
                    }
                    const uuid = this.api.hap.uuid.generate(PLUGIN + ':matter:' + platform.config.ipaddress + ':' + (platform.config.port || 20000) + ':' + relay.address);
                    const key = platform.config.ipaddress + ':' + (platform.config.port || 20000) + ':' + relay.address.split('/').map(Number).join('/');
                    candidates.push({ platform, relay, uuid, key });
                }
            }
        }
        if (!configured && candidates.length > 1) {
            this.log.warn('[Matter] Ambiguous legacy target. Specify ipaddress.');
            candidates.length = 0;
        }
        const counts = new Map();
        for (const c of candidates) counts.set(c.key, (counts.get(c.key) || 0) + 1);
        const targets = candidates.filter(c => counts.get(c.key) === 1);
        if (targets.length !== candidates.length) this.log.warn('[Matter] Duplicate relay addresses skipped.');
        const ids = new Set(targets.map(c => c.uuid));
        const stale = this.cached.filter(a => !ids.has(a.UUID));
        if (stale.length) await matter.unregisterPlatformAccessories(PLUGIN, PLATFORM, stale);
        
        for (const { platform, relay, uuid } of targets) {
            if (this.stopped) break;
            if (relay.matterRelay && relay.matterRelay.owner !== this) {
                this.log.warn('[Matter] Relay already owned by another companion: ' + relay.address);
                continue;
            }
            
            const binding = {
                owner: this, 
                ready: false, 
                pending: Promise.resolve(),
                lastSyncedPower: relay.power, // Cache do último estado sincronizado
                syncDebounceTimer: null, // Timer para debouncing
                
                sync: (power) => {
                    if (!binding.ready || this.stopped) return;
                    
                    // Evitar sincronizações redundantes com o mesmo estado
                    if (binding.lastSyncedPower === Boolean(power)) {
                        return;
                    }
                    
                    // Limpar timer anterior se existir
                    if (binding.syncDebounceTimer !== null) {
                        clearTimeout(binding.syncDebounceTimer);
                    }
                    
                    // Debounce: aguardar 200ms antes de enviar para evitar múltiplas sincronizações rápidas
                    binding.syncDebounceTimer = setTimeout(() => {
                        const onOff = Boolean(power);
                        binding.lastSyncedPower = onOff;
                        
                        binding.pending = binding.pending.then(() => {
                            if (binding.ready && !this.stopped) {
                                this.log.debug('[Matter] Syncing ' + relay.address + ' to ' + (onOff ? 'ON' : 'OFF'));
                                return matter.updateAccessoryState(uuid, 'onOff', { onOff });
                            }
                        }).catch(error => this.log.warn('[Matter] State update failed for ' + relay.address + ': ' + error.message));
                        
                        binding.syncDebounceTimer = null;
                    }, 200); // Debounce delay de 200ms
                },
            };
            
            const command = on => {
                if (!binding.ready || this.stopped) throw new Error('Relay is not ready');
                this.log.info('[Matter] Command ' + (on ? 'ON' : 'OFF') + ' -> ' + relay.address);
                relay.setPower(on, true);
            };
            
            const accessory = {
                UUID: uuid, 
                displayName: relay.name,
                deviceType: matter.deviceTypes.OnOffLight,
                manufacturer: 'BTicino / Legrand', 
                model: 'MyHome MHRelay',
                serialNumber: uuid.replace(/-/g, ''),
                clusters: { onOff: { onOff: Boolean(relay.power) } },
                handlers: { onOff: {
                    on: async () => command(true), 
                    off: async () => command(false),
                    toggle: async () => command(!relay.power),
                } },
            };
            
            relay.matterRelay = binding;
            this.bindings.set(uuid, binding);
            
            try {
                await matter.registerPlatformAccessories(PLUGIN, PLATFORM, [accessory]);
                if (this.stopped) continue;
                binding.ready = true;
                binding.sync(relay.power);
                // Requisição de estado sincronizada com delay para evitar flood
                setTimeout(() => {
                    if (!this.stopped && binding.ready) {
                        platform.controller.getRelayState(relay.address);
                    }
                }, 500);
                this.log.info('[Matter] Registered ' + relay.name + ' (' + relay.address + ') as OnOffLight');
            } catch (error) {
                delete relay.matterRelay;
                this.bindings.delete(uuid);
                this.log.error('[Matter] Registration failed for ' + relay.address + ': ' + error.message);
            }
        }
        if (!targets.length) this.log.info('[Matter] No relays selected. Check configuration and same-process placement.');
    }
}

module.exports = { MatterRelayPlatform, platforms, PLUGIN, PLATFORM };
