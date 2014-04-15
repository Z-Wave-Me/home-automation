/*** Z-Way HA Automation module base class ************************************

 Version: 1.0.0
 -------------------------------------------------------------------------------
 Author: Stanislav Morozov <morozov@z-wave.me>
 Copyright: (c) ZWave.Me, 2014

 ******************************************************************************/

DevicesCollection = function (controller) {
    DevicesCollection.super_.call(this, controller);
    this.controller = controller;
    this.config = {};
    this.models = [];
    this.length = 0;
};

DevicesCollection.prototype = {
    add: function (id, config) {

    }
};

/*
required function
add
remove
get
reset
destroy
set
at
pop
sync
where
findWhere
clone
 */

// aliases
DevicesCollection.prototype.register = DevicesController.prototype.add;
DevicesCollection.prototype.unregister = DevicesController.prototype.remove;