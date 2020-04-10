const mdns = require('multicast-dns');
const txt = require('dns-txt')();
const EventEmitter = require('events');
const { Device } = require('./Device');
class DeviceFinder extends EventEmitter {
    constructor() {
        super();
        this.devices = [];
    }

    addDeviceIfNotExists(deviceName) {
        if (deviceName.endsWith('_googlecast._tcp.local') && !deviceName.endsWith('_sub._googlecast._tcp.local') && !(deviceName in this.devices)) {
            this.devices[deviceName] = {
                name: deviceName
            };
        }
    }

    addDevicePropIfNotExists(deviceName, prop, value) {
        if (!(prop in this.devices[deviceName])) {
            this.devices[deviceName][prop] = value;

            if (
                'name' in this.devices[deviceName] &&
                'friendlyName' in this.devices[deviceName] &&
                'host' in this.devices[deviceName]
            ) {
                let device = new Device(
                    this.devices[deviceName].name,
                    this.devices[deviceName].friendlyName,
                    this.devices[deviceName].host
                );
                this.emit('device', device);
            }
        }
    }

    onMdnsAnswer(answer) {
        if (answer.type === 'PTR' && answer.name === '_googlecast._tcp.local') {
            this.addDeviceIfNotExists(answer.data);
        } else {
            this.addDeviceIfNotExists(answer.name);
        }

        if (answer.type === 'TXT' && answer.name in this.devices) {
            let data = Array.isArray(answer.data) ? answer.data : [].push(answer.data);
            let friendlyName = data
                .map(item => txt.decode(item))
                .filter(item => Object.keys(item).find(key => key == 'n' || key == 'fn'));
            if (friendlyName.length > 0) {
                if ('n' in friendlyName[0])
                    this.addDevicePropIfNotExists(answer.name, 'friendlyName', friendlyName[0]['n']);
                else if ('fn' in friendlyName[0])
                    this.addDevicePropIfNotExists(answer.name, 'friendlyName', friendlyName[0]['fn']);
            }
        }

        if (answer.type === 'SRV' && answer.name in this.devices) {
            let host = answer.data.target;
            this.addDevicePropIfNotExists(answer.name, 'host', host);
        }
    }

    onMdnsResponse(response) {
        response.answers.forEach(this.onMdnsAnswer.bind(this));
        response.additionals.forEach(this.onMdnsAnswer.bind(this));
    }

    start() {
        this.mdns = mdns();
        this.mdns.on('response', this.onMdnsResponse.bind(this));
        this.mdns.query({
            questions: [
                {
                    name: '_googlecast._tcp.local',
                    type: 'PTR'
                }
            ]
        });
    }

    stop() {
        this.mdns.removeAllListeners();
        this.mdns.destroy();
        this.mdns = null;
    }
}

module.exports.DeviceFinder = DeviceFinder;
