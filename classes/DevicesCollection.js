/*** Z-Way HA Automation module base class ************************************

 Version: 1.0.0
 -------------------------------------------------------------------------------
 Author: Stanislav Morozov <morozov@z-wave.me>
 Copyright: (c) ZWave.Me, 2014

 ******************************************************************************/

DevicesController = function (id, controller) {
    var self = this;
    this.id = id;
    this.controller = controller;
    this.config = {};
};

DevicesController.prototype.register = function (id, config) {
    console.log("--- Starting module ");
};

DevicesController.prototype.unregister = function (id) {
    console.log("--- Stopping module ");
};

/*
required function
get
set
 */

// aliases
DevicesController.prototype.init = DevicesController.prototype.register;
DevicesController.prototype.stop = DevicesController.prototype.unregister;