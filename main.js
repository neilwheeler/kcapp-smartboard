var debug = require('debug')('kcapp-smartboard:main');
var smartboard = require('./smartboard')("5cf8218da78e", 15);

this.connected = false;
this.peripheral = {};

// TODO Get battery status
// TODO Add notification of board low power

function disconnectListener(data) {
    debug(`Got leg_finished event!`);
    var match = data.match;
    if (match.is_finished) {
        debug("Match is finished, disconnecting from board");
        smartboard.disconnect(this.peripheral, () => {
            debug("Disconnected");
            this.connected = false;
         });
    } else {
        debug("Leg is finished");
    }
}

function connectToMatch(data) {
    var match = data.match;
    var legId = match.current_leg_id;
    if (match.venue.id === kcapp.DART_REIDAR_VENUE_ID) {
        debug(`Connected to match ${match.id}`);
        // TODO add a generic "venue_configuration" to avoid hardcoding this here

        kcapp.connectLegNamespace(legId, (leg) => {
            debug(`Connected to leg ${legId}`);
            if (!this.connected) {
                leg.emit('announce', { type: 'notify', message: 'Searching for smartboard ...' });
                smartboard.startScan();
                smartboard.connect((peripheral) => {
                    this.connected = true;
                    this.peripheral = peripheral;
                    smartboard.initialize(peripheral,
                        (dart) => {
                            var player = leg.currentPlayer;
                            if (dart.multiplier == 0) {
                                dart.multiplier = 1;
                                dart.zone = 'inner';
                            } else if (dart.multiplier == 1) {
                                dart.zone = 'outer';
                            }
                            debug(`Got throw ${JSON.stringify(dart)} for ${player.player.id}`);
                            leg.emitThrow(dart);
                            player.current_score -= dart.score * dart.multiplier;

                            if (player.current_score === 0 && dart.multiplier === 2) {
                                debug("Player Checkout! sending visit");
                                leg.emit('announce', { type: 'confirm_checkout', message: "" });
                            } else if (player.current_score <= 1) {
                                debug("Player busted, sending visit");
                                leg.emitVisit();
                            } else if (leg.dartsThrown == 3) {
                                leg.emitVisit();
                            }
                        },
                        () => {
                            debug("Button pressed, sending visit");
                            leg.emitVisit();
                        }
                    );
                    leg.on('leg_finished', disconnectListener.bind(this));
                    leg.emit('announce', { type: 'success', message: 'Connected to smartboard' });
                });
            } else {
                debug("Already connected to board...");
                leg.on('leg_finished', disconnectListener.bind(this));
            }
        });
    }
}


var kcapp = require('kcapp-sio-client/kcapp')("10.12.141.230", 3000);
kcapp.connect(() => {
    kcapp.on('new_match', (data) => {
        connectToMatch(data);
    });
    kcapp.on('warmup_started', (data) => {
        connectToMatch(data);
    });
});