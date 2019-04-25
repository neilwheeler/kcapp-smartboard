var debug = require('debug')('kcapp-smartboard:board');
var noble = require('noble');

/** List containing all numbers on the board. Used to shift scores when board is rotated */
const BOARD = [15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5, 20, 1, 18, 4, 13, 6, 10];
/** Service containing board characteristics */
const SERVICE_SCORING = "fff0";
/** Characteristic to control the button */
const CHARACTERISTIC_BUTTON = "fff2";
/** Characteristic to subscribe to throw notifications */
const CHARACTERISTIC_THROW_NOTIFICATIONS = "fff1";

/**
 * Shift the given number depending on board rotation
 * @param {int} num - Number reported by board
 * @param {int} button - Number closes to smartboard button
 */
function shift(num, button) {
  if (num == 25) {
    // No need to shift bull
    return num;
  }
  var index = BOARD.indexOf(num) + BOARD.indexOf(button);
  if (index > BOARD.length) {
      index = index - BOARD.length;
  }
  return BOARD[index];
}

/**
 * Start scanning for the board
 */
exports.startScan = () => {
  debug("Started scanning for board");
  noble.startScanning();
}

/**
 * Connect to the dart board
 * This method will add a callback to the discover method for bluetooth,
 * and check all peripherals found until it finds one matching the UUID
 * we are looking for
 *
 * @param {function} callback - Callback when dart is thrown
  */
exports.connect = (callback) => {
  this.discoverCallback = (peripheral) => {
    if (peripheral.uuid === this.uuid) {
      callback(peripheral);
      debug("Found device, stopped scanning");
      noble.stopScanning();
      this.peripheral = peripheral;
    }
  };
  noble.on('discover', this.discoverCallback);
}

/**
 * Initialize the dart board, by setting up notification listeners
 * for darts thrown, and button presses
 *
 * @param {object} - Peripheral object to initialize
 * @param {function} - Callback when dart is thrown
 * @param {function} - Callback when button is pressed
 */
exports.initialize = (peripheral, throwCallback, playerChangeCallback) => {
  peripheral.connect((error) => {
    if (error) {
      debug("ERROR: " + error);
    }
    debug('Connected to ' + peripheral.advertisement.localName + " (" + peripheral.uuid + ")");

    // Get the scoring service
    peripheral.discoverServices([SERVICE_SCORING], (error, services) => {
      if (error) {
        debug("ERROR: " + error);
      }

      var scoringService = services[0];
      scoringService.discoverCharacteristics([CHARACTERISTIC_BUTTON, CHARACTERISTIC_THROW_NOTIFICATIONS], (error, characteristics) => {
        if (error) {
          debug("ERROR: " + error);
        }

        // To enable listening for notifications, we first need to set the button as high (0x03)
        var buttonCharacteristic = characteristics[1];
        buttonCharacteristic.write(new Buffer([0x03]), true, (error) => {
          if (error) {
            debug("ERROR: " + error);
          }
          debug('Enabled listening');
        });
        this.buttonCharacteristic = buttonCharacteristic;

        // Subscribe to throw notifications
        var throwNotifyCharacteristic = characteristics[0];
        throwNotifyCharacteristic.subscribe((error) => {
          if (error) {
            debug("ERROR: " + error);
          }
          debug('Subscribed to throw noftifications!');
        });

        throwNotifyCharacteristic.on('data', (data, isNotification) => {
	  var rawValue = data.readUInt8(0);
          var dart = {
            score: shift(rawValue, this.buttonNumber),
            multiplier: data.readUInt8(1)
          };
          if (dart.multiplier == 170 && rawValue == 85) {
            playerChangeCallback();
          } else {
            throwCallback(dart);
          }
        });
        this.throwNotifyCharacteristic = throwNotifyCharacteristic;
      });
    });
  });
}

/**
 * Disconnect from the connected peripheral
 */
exports.disconnect = (peripheral, callback) => {
  debug(`Removing 'discover' callback`);
  noble.removeListener('discover', this.discoverCallback);

  if (this.throwNotifyCharacteristic) {
    this.throwNotifyCharacteristic.unsubscribe((error) => {
      if (error) {
        debug(`ERROR: ${error}`);
      }
      debug(`Unsubscribed from throw notifications`);
    });
  }
  if (this.buttonCharacteristic) {
    this.buttonCharacteristic.write(new Buffer([0x02]), true, (error) => {
      if (error) {
        debug(`ERROR: ${error}`);
      }
      debug(`Disabled listening on characteristic ${CHARACTERISTIC_BUTTON}`);
      peripheral.disconnect((error) => {
        if (error) {
          debug("Error " + error);
        }
        debug('Disconnected from ' + peripheral.advertisement.localName);
        if (callback) {
          callback();
        }
      });
    });
  }
}

function interrupt() {
  debug(this.peripheral);
  if (this.peripheral) {
    debug("Caught interrupt signal, Disconnecting...");

    this.disconnect(() => {
      process.exit();
    });

    // Give the board 3 seconds to disconnect before we die....
    setTimeout(() => { process.exit(); }, 3000 );
  } else {
    process.exit();
  }
}

/**
 * Configure the smartboard module
 * @param {string} uuid - UUID of smartboard
 * @param {int} buttonNumber - Number the button is closest to
 */
module.exports = (uuid, buttonNumber) => {
  this.uuid = uuid;
  this.buttonNumber = buttonNumber;

  process.on('SIGINT', interrupt.bind(this) );
  return this;
};
