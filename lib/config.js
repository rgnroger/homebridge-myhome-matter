'use strict';

function hasCoordinate(value) {
    if (value === undefined || value === null || value === '') return false;
    const number = Number(value);
    return Number.isInteger(number) && number >= 0 && number <= 99;
}

function isConfiguredDevice(device) {
    return device != null
        && typeof device.name === 'string'
        && device.name.trim() !== ''
        && hasCoordinate(device.area)
        && hasCoordinate(device.point);
}

function address(device) {
    const bus = hasCoordinate(device.bus) ? Number(device.bus) : 0;
    return `${bus}/${Number(device.area)}/${Number(device.point)}`;
}

function configured(items) {
    return Array.isArray(items) ? items.filter(isConfiguredDevice) : [];
}

function isConfiguredAuxContact(device) {
    if (device == null || typeof device.name !== 'string' || device.name.trim() === '') return false;
    const channel = Number(device.channel);
    return Number.isInteger(channel) && channel >= 1 && channel <= 8;
}

function configuredAuxContacts(items) {
    return Array.isArray(items) ? items.filter(isConfiguredAuxContact) : [];
}

function isConfiguredCenPlus(control) {
    if (control == null || typeof control.name !== 'string' || control.name.trim() === '') return false;
    const cen = Number(control.cen);
    return Number.isInteger(cen) && cen >= 1 && cen <= 2047;
}

function configuredCenPlusControls(items) {
    return Array.isArray(items) ? items.filter(isConfiguredCenPlus) : [];
}

/*
 * Convert the visual Homebridge configuration into the legacy device format.
 * Empty rows created by the configuration UI are deliberately ignored.
 */
function normalizeVisualConfig(input) {
    const config = input || {};
    if (Array.isArray(config.devices)) return config;

    const devices = [];

    configured(config.lights).forEach((device) => devices.push({
        accessory: 'MHRelay',
        name: device.name.trim(),
        address: address(device),
        matter: device.matter === true,
    }));

    configured(config.dimmers).forEach((device) => devices.push({
        accessory: 'MHDimmer',
        name: device.name.trim(),
        address: address(device),
    }));

    configured(config.blinds).forEach((device) => devices.push({
        accessory: 'MHBlind',
        name: device.name.trim(),
        address: address(device),
        time: Number(device.travelTime || 0),
        invert: Boolean(device.invert),
    }));

    configured(config.advancedBlinds).forEach((device) => devices.push({
        accessory: 'MHBlindAdvanced',
        name: device.name.trim(),
        address: address(device),
    }));

    configuredAuxContacts(config.auxContacts).forEach((device) => devices.push({
        accessory: 'MHDryContact',
        name: device.name.trim(),
        address: Number(device.channel),
        type: 'Contact',
        visualDryContact: true,
        invert: Boolean(device.invert),
    }));

    configuredCenPlusControls(config.cenPlusControls).forEach((control) => {
        for (let button = 1; button <= 4; button++) {
            const configuredName = typeof control[`button${button}`] === 'string'
                ? control[`button${button}`].trim()
                : '';
            devices.push({
                accessory: 'MHCenPlusButton',
                button: button,
                name: configuredName || `${control.name.trim()} BT${button}`,
                address: Number(control.cen),
            });
        }
    });

    return Object.assign({}, config, {
        ipaddress: config.host,
        ownpassword: config.password,
        setclock: Boolean(config.setclock),
        devices: devices,
    });
}

module.exports = {
    hasCoordinate,
    isConfiguredDevice,
    isConfiguredAuxContact,
    isConfiguredCenPlus,
    normalizeVisualConfig,
};
