var debug = require('debug')('kcapp-smartboard:movement');
var gpio = require('rpi-gpio');

/**
 * Initialize the movement sensor with a callback
 * @param {func} callback - Callback function to trigger when movement is detected
 * @param {int} bouncetime - Bouncetime of 'gpio change' events. Allows to ignore events happening too frequently (Default: 200ms)
 */
exports.initialize = (callback, bouncetime = 200) => {
    this.callback = callback;
    gpio.on('change', (pin, value) => {
        var last = Date.now() - last;
        if (value && last > bouncetime) {
            debug("Movement Detected!");
            this.callback();
        }
        this.last_motion = Date.now();
    });
    debug(`Registering change callback on pin ${this.pin}`);
    gpio.setup(this.pin, gpio.DIR_IN, gpio.EDGE_RISING);
};

/**
 * Configure the movement sensor module
 * @param {int} pin - GPIO Pin of movement sensor (Board mode)
 */
module.exports = (pin) => {
    this.pin = pin;
    this.last_motion = Date.now();
    return this;
};