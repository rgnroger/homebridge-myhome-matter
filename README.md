# homebridge-myhome-openwebnet

A Homebridge plugin for BTicino/Legrand MyHome BUS/SCS installations using the OpenWebNet protocol.

> This is a beta release. Lights, 3477 dry contacts, and 4680 CEN+ scenario controls have been validated on a real installation. See [Validation status](#validation-status) before using it in production.

## Features

- Lights and relays with commands and live feedback
- Dimmers
- Standard blinds with travel-time position estimation
- Advanced blinds with absolute position feedback
- BTicino/Legrand 3477 dry contacts, channels 1 through 8
- HC/HD/HS/L/N/NT4680 scenario controls configured as CEN+
- Short-press and long-press events for all four 4680 buttons
- Visual configuration through the Homebridge UI

## Requirements

- Node.js 18 or later
- Homebridge 1.6 or later
- A MyHome gateway with OpenWebNet enabled
- The gateway IP address, OpenWebNet port, and password when required

OpenWebNet commonly uses TCP port **20000**, but the value must match your gateway configuration.

## Compatible MyHome gateways

The plugin works with IP gateways that expose the standard OpenWebNet TCP service. The upstream OpenWebNet core reports successful use with:

- F453
- F454 v1
- MH200N
- MH201
- MyHOMEServer1 with firmware 2.x

These OpenWebNet-capable models are also expected to work, but have not yet been physically validated with this fork:

- F453AV
- MH202

Gateway firmware and authentication settings may affect compatibility. Recent gateways may use HMAC authentication, while older installations may require enabling OpenWebNet access for the Homebridge host IP address.

## Installation

Install the beta release:

```bash
npm install -g homebridge-myhome-openwebnet@beta
```

Restart Homebridge after installation.

The plugin can also be installed from the Homebridge UI when it becomes available in plugin search results.

## Visual configuration

Open the Homebridge UI, locate **MyHome OpenWebNet**, and select **Settings**. Enter the gateway settings first:

| UI field | What to enter | Example |
| --- | --- | --- |
| Plugin name | Name shown by Homebridge | MyHome OpenWebNet |
| MyHome gateway IP | Local IP address of the web server | 192.168.1.10 |
| OpenWebNet port | TCP port configured on the gateway | 20000 |
| OpenWebNet password | Gateway password, when enabled | YOUR_PASSWORD |

Device lists start empty. Select the appropriate **Add** button and complete the fields described below.

### Lights

Select **Add light** for every standard on/off light or relay.

| Field | Meaning | Example |
| --- | --- | --- |
| Light name | Name displayed in HomeKit/Home Assistant | Living room light |
| Area (A) | MyHome environment address | 1 |
| Point (PL) | MyHome light-point address | 1 |
| BUS (B) | Local bus number, normally 0 | 0 |

### Dimmers

Select **Add dimmer** for every light with brightness control.

| Field | Meaning | Example |
| --- | --- | --- |
| Dimmer name | Name displayed in HomeKit/Home Assistant | Dining room dimmer |
| Area (A) | MyHome environment address | 1 |
| Point (PL) | MyHome light-point address | 2 |
| BUS (B) | Local bus number, normally 0 | 0 |

### Standard blinds

Select **Add standard blind** for a blind that does not report an absolute position.

| Field | Meaning | Example |
| --- | --- | --- |
| Blind name | Name displayed in HomeKit/Home Assistant | Living room blind |
| Area (A) | MyHome environment address | 2 |
| Point (PL) | MyHome point address | 1 |
| BUS (B) | Local bus number, normally 0 | 0 |
| Travel time (s) | Approximate full opening or closing time | 40 |
| Reverse | Swaps the up and down directions | Off |

The plugin estimates the position from the configured travel time. A motor with its own end stops can use a slightly longer configured time, but the value should remain reasonably close to the real travel time for useful position feedback.

### Advanced blinds

Select **Add advanced blind** for a MyHome blind actuator that reports and accepts an absolute position.

| Field | Meaning | Example |
| --- | --- | --- |
| Blind name | Name displayed in HomeKit/Home Assistant | Bedroom blind |
| Area (A) | MyHome environment address | 2 |
| Point (PL) | MyHome point address | 2 |
| BUS (B) | Local bus number, normally 0 | 0 |

### 3477 dry contacts

Configure the 3477 module as **Contact status** in the MyHome configuration software. Then select **Add dry contact**.

| Field | Meaning | Example |
| --- | --- | --- |
| Contact name | Name displayed in HomeKit/Home Assistant | Garage door contact |
| AUX channel | Channel configured on the 3477, from 1 to 8 | 1 |
| Reverse open/closed | Reverses the logical state when it does not match the physical contact | Off |

With the input wires apart, the contact should normally appear as open. Enable the reverse option only if the reported state is opposite to the physical state.

### 4680 scenario controls (CEN+)

Configure each module as **Programmed Scenario PLUS** in the MyHome configuration software and note its **CEN number**. Then select **Add CEN+ control**.

| Field | Meaning | Example |
| --- | --- | --- |
| Control name | Name of the four-button control | Garage scenarios |
| CEN number | Same number configured in MyHomeSuite | 1 |
| BT1 name | Name of the first button | Main light |
| BT2 name | Name of the second button | Auxiliary light |
| BT3 name | Name of the third button | Open blind |
| BT4 name | Name of the fourth button | Close blind |

Each button is exposed as a stateless programmable switch and reports:

- Single press
- Long press

In Home Assistant, these controls are available as device automation triggers rather than switches that remain on.

## Address format

The visual UI asks for **Area (A)**, **Point (PL)**, and **BUS (B)** separately. The plugin converts them to the OpenWebNet `B/A/PL` format.

For example:

| BUS | Area | Point | OpenWebNet address |
| --- | --- | --- | --- |
| 0 | 1 | 4 | 0/1/4 |

## Complete configuration example

The following example contains one entry for every device type currently available in the visual configuration:

```json
{
  "name": "MyHome OpenWebNet",
  "host": "192.168.1.10",
  "port": 20000,
  "password": "YOUR_PASSWORD",
  "lights": [
    {
      "name": "Living room light",
      "area": 1,
      "point": 1,
      "bus": 0
    }
  ],
  "dimmers": [
    {
      "name": "Dining room dimmer",
      "area": 1,
      "point": 2,
      "bus": 0
    }
  ],
  "blinds": [
    {
      "name": "Living room blind",
      "area": 2,
      "point": 1,
      "bus": 0,
      "travelTime": 40,
      "invert": false
    }
  ],
  "advancedBlinds": [
    {
      "name": "Bedroom blind",
      "area": 2,
      "point": 2,
      "bus": 0
    }
  ],
  "auxContacts": [
    {
      "name": "Garage door contact",
      "channel": 1,
      "invert": false
    }
  ],
  "cenPlusControls": [
    {
      "name": "Garage scenarios",
      "cen": 1,
      "button1": "Main light",
      "button2": "Auxiliary light",
      "button3": "Open blind",
      "button4": "Close blind"
    }
  ],
  "platform": "MyHomeOpenWebNet"
}
```

Replace all example values with the values from your installation. Never publish your real configuration file.

## Home Assistant

The bridge can be paired with Home Assistant through the **HomeKit Device** integration. CEN+ buttons are stateless accessories and are available as device automation triggers.

A HomeKit bridge can only be paired with one controller at a time. To move it between Apple Home and Home Assistant, remove it from the current controller first.

## Validation status

| Feature | Status |
| --- | --- |
| Lights and relays | Validated on a real installation |
| Light feedback | Validated on a real installation |
| 3477 dry contacts | Validated on a real installation |
| 4680 CEN+, BT1–BT4 | Validated on a real installation and Home Assistant |
| Standard blind | Commands and feedback validated on an actuator; validation with a physical motor is pending |
| Dimmer | Covered by automated tests; additional physical validation is recommended |
| Advanced blind | Covered by automated tests; additional physical validation is recommended |
| Energy meter | Not implemented or validated in this release |

## Troubleshooting

To confirm that the gateway is reachable:

```powershell
Test-NetConnection 192.168.1.10 -Port 20000
```

Replace the example address with your gateway IP address.

If accessories do not respond:

- confirm that the gateway is reachable on the network;
- confirm that the OpenWebNet port is accessible;
- verify the password;
- restart Homebridge after changing the configuration;
- inspect the Homebridge log for received frames and events.

## Development

```bash
npm install
npm test
npm run build
npm pack --dry-run
```

The test suite covers configuration normalization, OpenWebNet frames, a simulated TCP gateway, HomeKit feedback, and CEN+ events.

## Credits

The OpenWebNet core is based on work from `homebridge-myhome-hb2` and its predecessor projects.

## Disclaimer

This software is provided as-is, without warranty. This project is not affiliated with or supported by Legrand, BTicino, Apple, Homebridge, or the Home Assistant project.

## License

[MIT](LICENSE)
