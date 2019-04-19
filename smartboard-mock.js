var debug = require('debug')('kcapp-smartboard-mock:board');

/** Service containing board characteristics */
const SERVICE_SCORING = "fff0";
/** Characteristic to control the button */
const CHARACTERISTIC_BUTTON = "fff2";
/** Characteristic to subscribe to throw notifications */
const CHARACTERISTIC_THROW_NOTIFICATIONS = "fff1";

exports.startScan = () => {
  debug("Started scanning")
}

exports.connect = (callback) => {
  this.discoverCallback = (peripheral) => {
    if (peripheral.uuid === this.uuid) {
      callback(peripheral);
      debug("Found device, stopped scanning");
      this.peripheral = peripheral;
    }
  };
  this.discoverCallback({ uuid: this.uuid, advertisement: { localName: 'joofunn Dartboard'   }} );
}

exports.initialize = (peripheral, throwCallback, playerChangeCallback) => {
    debug('Connected to ' + peripheral.advertisement.localName + " (" + peripheral.uuid + ")");
    debug('Enabled listening');
    debug('Subscribed to throw noftifications!');
}

exports.disconnect = (peripheral, callback) => {
    debug(`Removing 'discover' callback`);
    debug(`Unsubscribed from throw notifications`);
    debug(`Disabled listening on characteristic ${CHARACTERISTIC_BUTTON}`);
    debug('Disconnected from ' + peripheral.advertisement.localName);
    callback();
}

/**
 * Configure the smartboard module
 * @param {string} uuid - UUID of smartboard
 */
module.exports = (uuid, buttonNumber) => {
  this.uuid = uuid;
  this.buttonNumber = buttonNumber;
  return this;
};