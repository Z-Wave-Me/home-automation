/*** Z-Wave Binding module ********************************************************

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

    var self = this;
    
    this.zway = new ZWaveBinding(this.config.name, this.config.port, {
        configFolder: this.config.config || 'config',
        translationsFolder: this.config.translations || 'translations',
        zddxFolder: this.config.ZDDX || 'ZDDX',
        terminationCallback: function() {
            self.terminating.call(self);
        }
    });
    
    this.zway.discover();
    
    zway = this.zway;
};

ZWave.prototype.stop = function () {
    console.log("--- ZWave.stop()");
    ZWave.super_.prototype.stop.call(this);

};

ZWave.prototype.terminating = function () {
    console.log("Terminating Z-Wave binding");

    this.zway.stop();
    this.zway = null;
    zway = null;

    if (this.config.closeOnExit) {
        exit();
    }
};
