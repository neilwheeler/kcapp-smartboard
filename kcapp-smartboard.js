var debug = require('debug')('kcapp-smartboard:main');
var smartboard = require('./smartboard')("5cf8218da78e", 15);
//var sensor = require('./movement-sensor')(40);

const SHOOTOUT = 2;
const CRICKET = 4;
const DARTSATX = 5;

this.connected = false;
this.peripheral = {};

/**
 * Disconnect from the smartboard
 * @param {object} data
 */
function disconnectListener(data) {
    smartboard.disconnect(this.peripheral, () => {
        debug("Disconnected");
        this.connected = false;
    });
}

function connectToMatch(data) {
    var match = data.match;
    var legId = match.current_leg_id;
    if (match.venue && match.venue.config.has_smartboard) {
        debug(`Connected to match ${match.id}`);
        kcapp.connectLegNamespace(legId, (leg) => {
            debug(`Connected to leg ${legId}`);
            if (!this.connected) {
                leg.emit('announce', { type: 'notify', message: 'Searching for smartboard ...' });
                smartboard.startScan();
                smartboard.connect((peripheral) => {
                    this.connected = true;
                    this.peripheral = peripheral;

                    var lastBoardData = 0;
                    smartboard.initialize(peripheral,
                        (dart) => {
                            lastBoardData = Date.now();
                            var player = leg.currentPlayer;
                            if (dart.multiplier == 0) {
                                dart.multiplier = 1;
                                dart.zone = 'inner';
                            } else if (dart.multiplier == 1) {
                                dart.zone = 'outer';
                            }
                            debug(`Got throw ${JSON.stringify(dart)} for ${player.player.id}`);
                            leg.emitThrow(dart);

                            if (match.match_type.id == SHOOTOUT) {
                                player.current_score += dart.score * dart.multiplier;
                                var visits = leg.leg.visits.length;
                                if (visits > 0 && ((visits * 3 + leg.dartsThrown) % (9 * leg.leg.players.length) === 0)) {
                                    debug("Match finished! sending visit");
                                    leg.emitVisit();
                                } else if (leg.dartsThrown == 3) {
                                    leg.emitVisit();
                                }
                            }
                            else if (match.match_type.id == CRICKET || match.match_type.id == DARTSATX) {
                                if (leg.dartsThrown == 3) {
                                    leg.emitVisit();
                                }
                            }
                            else {
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
                            }
                        },
                        () => {
                            debug("Button pressed, sending visit");
                            lastBoardData = Date.now();
                            leg.emitVisit();
                        }
                    );

                    /*sensor.initialize(() => {
                        var last = Date.now() - lastBoardData;
                        debug(`Got movement. Last dart ${last}ms ago`);
                        if (last > 200) {
                            // TODO Send miss
                            debug("Movement sensor: Miss");
                        }
                    });*/

                    leg.on('leg_finished', (data) => {
                        debug(`Got leg_finished event!`);
                        var match = data.match;
                        if (match.is_finished) {
                            debug("Match is finished, disconnecting from board");
                            disconnectListener.bind(this)(data);
                        } else {
                            debug("Leg is finished");
                        }
                    });
                    leg.emit('announce', { type: 'success', message: 'Connected to smartboard' });

                    leg.on('cancelled', (data) => {
                        debug("Leg cancelled, disconnecting from board");
                        disconnectListener.bind(this)();
                    });
                });
            } else {
                debug("Already connected to board...");
                leg.on('leg_finished', disconnectListener.bind(this));
            }
        });
    }
}


var kcapp = require('kcapp-sio-client/kcapp')("localhost", 3000);
kcapp.connect(() => {
    kcapp.on('new_match', (data) => {
        connectToMatch(data);
    });
    kcapp.on('warmup_started', (data) => {
        connectToMatch(data);
    });
});
