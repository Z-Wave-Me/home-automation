/*** TagOnOff Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me>
Description:
    Mark devices with On/Off tags depending on their state
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function TagOnOff (id, controller) {
    // Call superconstructor first (AutomationModule)
    TagOnOff.super_.call(this, id, controller);
}

inherits(TagOnOff, AutomationModule);

_module = TagOnOff;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

TagOnOff.prototype.init = function (config) {
    TagOnOff.super_.prototype.init.call(this, config);

    var self = this;
    
    this.handler = function(vDev) {
        var type = vDev.get('deviceType'),
            level = vDev.get('metrics:level'),
            color = vDev.get('metrics:color'),
            isOn = false;

        if (
            (type === 'switchBinary' && level === 'on') ||
            (type === 'switchMultilevel' && parseInt(level, 10) > 0) ||
            (type === 'switchRGBW' && level === 'on' && (color.r > 0 || color.g > 0 || color.b > 0))
        ) {
            vDev.addTag(self.config.tagOn);
            vDev.removeTag(self.config.tagOff);
        }
        
        if (
            (type === 'switchBinary' && level === 'off') ||
            (type === 'switchMultilevel' && parseInt(level, 10) === 0) ||
            (type === 'switchRGBW' && (level === 'off' || (color.r === 0 && color.g === 0 && color.b === 0)))
        ) {        
            vDev.removeTag(self.config.tagOn);
            vDev.addTag(self.config.tagOff);
        }
    };
    
    this.controller.devices.on('change:metrics:level', this.handler);
};

TagOnOff.prototype.stop = function () {
    this.controller.devices.off('change:metrics:level', this.handler);
    
    TagOnOff.super_.prototype.stop.call(this);
};
