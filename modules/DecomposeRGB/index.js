/*** DecomposeRGB Z-Way HA module *******************************************

Version: 1.0.0
(c) Z-Wave.Me, 2021
-----------------------------------------------------------------------------
Author: Poltorak Serguei <ps@z-wave.me> 

Description:
	Decompose device RGB in several dimmers
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function DecomposeRGB (id, controller) {
	// Call superconstructor first (AutomationModule)
	DecomposeRGB.super_.call(this, id, controller);
}

inherits(DecomposeRGB, AutomationModule);

_module = DecomposeRGB;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

DecomposeRGB.prototype.init = function (config) {
	DecomposeRGB.super_.prototype.init.call(this, config);

	var self = this;

	function levelToColor(command, args) {
		switch (command) {
			case "on":
				return 255;
			case "off":
				return 0;
			case "exact":
				return parseInt(args.level) * 255.0/99.0
			default:
				return 0;
		}
	}
	
	function colorToLevel(color) {
		return Math.round(color * 99.0 / 255.0);
	}
	
	var title = this.getInstanceTitle(),
	    devId = "DecomposeRGB_" + this.id + "_",
	    defaults = {
		deviceType: "switchMultilevel",
		metrics: {
			icon: 'multilevel',
			title: '',
			level: 0
		}
	};

	defaults.metrics.title = title + ' Red ' + this.id;
	this.vDevR = this.controller.devices.create({
		deviceId: devId + "R",
		defaults: defaults,
		overlay: {},
		handler:  function (command, args) {
			self.handleLevel({ red: levelToColor(command, args) });
		},
		moduleId: this.id
	});
	
	defaults.metrics.title = title + 'Green ' + this.id;
	this.vDevG = this.controller.devices.create({
		deviceId: devId + "G",
		defaults: defaults,
		overlay: {},
		handler:  function (command, args) {
			self.handleLevel({ green: levelToColor(command, args) });
		},
		moduleId: this.id
	});

	defaults.metrics.title = title + 'Blue ' + this.id;
	this.vDevB = this.controller.devices.create({
		deviceId: devId + "B",
		defaults: defaults,
		overlay: {},
		handler:  function (command, args) {
			self.handleLevel({ blue: levelToColor(command, args) });
		},
		moduleId: this.id
	});

	this.handleLevel = function(colorObject) {
		var vDevRGB = self.controller.devices.get(self.config.rgb);
		var c = vDevRGB.get('metrics:color');
		vDevRGB.performCommand("exact", _.extend({ red: c.r, green: c.g, blue: c.b }, colorObject));
	};
	
	this.handleRGB = function (vDev) {
		if (vDev.get("metrics:level") === "off") {
			self.vDevR.set("metrics:level", 0);
			self.vDevG.set("metrics:level", 0);
			self.vDevB.set("metrics:level", 0);
		} else {
			self.vDevR.set("metrics:level", colorToLevel(vDev.get("metrics:color:r")));
			self.vDevG.set("metrics:level", colorToLevel(vDev.get("metrics:color:g")));
			self.vDevB.set("metrics:level", colorToLevel(vDev.get("metrics:color:b")));
		}
	};
	this.controller.devices.on(this.config.rgb, "change:metrics:level", this.handleRGB);
};

DecomposeRGB.prototype.stop = function () {
	this.controller.devices.off(this.config.rgb, "change:metrics:level", this.handleRGB);

	this.handle = null;
	
	if (this.vDevR) {
		this.controller.devices.remove(this.vDevR.id);
		this.vDevR = null;
	}
	if (this.vDevG) {
		this.controller.devices.remove(this.vDevG.id);
		this.vDevG = null;
	}
	if (this.vDevB) {
		this.controller.devices.remove(this.vDevB.id);
		this.vDevB = null;
	}

	DecomposeRGB.super_.prototype.stop.call(this);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------
