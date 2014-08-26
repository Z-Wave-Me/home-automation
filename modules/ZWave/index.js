/*** ZWave Gate module ********************************************************

Version: 2.0.0
-------------------------------------------------------------------------------
Author: Serguei Poltorak <ps@z-wave.me>
Copyright: (c) Z-Wave.Me, 2014

******************************************************************************/

function ZWave (id, controller) {
    ZWave.super_.call(this, id, controller);
}

// Module inheritance and setup

inherits(ZWave, AutomationModule);

_module = ZWave;


ZWave.prototype.init = function (config) {
    ZWave.super_.prototype.init.call(this, config);

    zway = new ZWaveBinding('zway', '/dev/ttyUSB0', {
        configFolder: 'config',
        translationsFolder: 'translations',
        zddxFolder: 'ZDDX',
        terminationCallback: this.terminating
    });
    
    zway.discover();
};

ZWave.prototype.stop = function () {
    console.log("--- ZWave.stop()");
    ZWave.super_.prototype.stop.call(this);

    this.terminating();
};

ZWave.prototype.terminating = function () {
    console.log("Terminating Z-Wave binding");
    zway = null;
};
