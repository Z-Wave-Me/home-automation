/*** SunriseSunset Z-Way HA module *******************************************

Version: 2.0.2
(c) Z-Wave.Me, 2014
-----------------------------------------------------------------------------
Author: James Millar <islipfd19@gmail.com>
Description:
    This module turns devices on and off based on sunrise and sunset times

    Change Log:
    2.0.2 - Added cron features and functionality suggested by pofs.
******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function SunriseSunset (id, controller) {
    // Call superconstructor first (AutomationModule)
    SunriseSunset.super_.call(this, id, controller);
}

inherits(SunriseSunset, AutomationModule);

_module = SunriseSunset;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

SunriseSunset.prototype.init = function (config) {
    SunriseSunset.super_.prototype.init.call(this, config);

    var self = this;

    sEpoch = Math.round((+new Date()) / 1000); // Get the current time of day.
    console.log("INFO SunriseSunset: Epoch = " + sEpoch);

    var stime = this.config.stime; // SunriseSunset polling time
    var etime = this.config.etime; // Epoch polling time

    pa = config.periodrise;
    pb = config.periodset;
    MyTimea = Math.round(pa * 60);
    MyTimeb = Math.round(pb * 60); 
	
    // We prevent an undefined error by testing for 'stime'
    if (stime){
        var ps = stime;
 
        console.log("INFO SunriseSunset: stime = " + stime);
        console.log("INFO SunriseSunset: ps = " + ps);
		
        // Split the time entered and strip any leading zeros, calculate the 
        // appropriate minutes from the hour provided and assign the remaining 
        // minute(s) to 'm'.
        var ms = stime.split(":")[1];
        var hs = stime.split(":")[0];
        var ms = ms.replace(/^0+/, '');
        var hs = hs.replace(/^0+/, '');
        var ms = Math.round(ms);
//        var hsa = Math.round(hs * 60);
//        var ps = Math.round(hsa + mt);
        var hs = Math.round(hs);
		
        console.log("INFO SunriseSunset: ms = " + ms);
        console.log("INFO SunriseSunset: hs = " + hs);
//        console.log("INFO SunriseSunset: hsa = " + hsa);
        console.log("INFO SunriseSunset: ps = " + ps);
		
        var ms = (ms < 60) ? [0, 59, ms] : null;
//        var hs = p >= 24*60 ? 0 : (p/60 >=1 ? [0, 23, hs] : null);
        var hs = (hs < 1) ? [0] : [0, 23, hs];
//        var wd = p/24/60 >=1 ? [0, 6, Math.round(p/24/60)] : null;

        console.log("INFO SunriseSunset: ms = " + ms);
        console.log("INFO SunriseSunset: hs = " + hs);
        console.log("INFO SunriseSunset: ps = " + ps);
    }

    // We prevent an undefined error by testing for 'etime'
    if (etime) {
        var pe = etime;
 
        console.log("INFO SunriseSunset: etime = " + etime);
        console.log("INFO SunriseSunset: pe = " + pe);

        if (MyTimea < ps) { // Ensure that epoch cron isn't greater than the sunrise/sunset offset selection.
            pe = Math.round(MyTimea - 1);
        } else if (MyTimeb < ps) {
            pe = Math.round(MyTimeb - 1);
        }

        // Split the time entered and strip any leading zeros, calculate the
        // appropriate minutes from the hour provided and assign the remaining
        // minute(s) to 'me'.
        var me = etime.split(":")[1];
        var he = etime.split(":")[0];
        var me = me.replace(/^0+/, '');
        var he = he.replace(/^0+/, '');
        var me = Math.round(me);
        var he = Math.round(he * 60);
        var pe = Math.round(he + me);
        var me = Math.round(me);
        console.log("INFO SunriseSunset: me = " + me);
        console.log("INFO SunriseSunset: he = " + he);
        console.log("INFO SunriseSunset: pe = " + pe);

        var me = (pe < 60) ? [0, 59, pe] : 0;
        var he = pe >= 24*60 ? 0 : (pe/60 >=1 ? [0, 23, Math.round(pe/60)] : null);

        console.log("INFO SunriseSunset: me = " + me);
        console.log("INFO SunriseSunset: he = " + he);
        console.log("INFO SunriseSunset: pe = " + pe);
    }

    this.SunriseSunset = function() {
    var self = this;
        http.request({
            url: "http://api.openweathermap.org/data/2.5/weather?q=" + this.config.city + "," + this.config.country,
            async: true,
            success: function(res) {
                try {
                    pa = config.periodrise;
                    pb = config.periodset;
                    MyTimea = Math.round(pa * 60);
                    MyTimeb = Math.round(pb * 60);
                    console.log("INFO SunriseSunset: MyTimea = " + MyTimea);
                    console.log("INFO SunriseSunset: MyTimeb = " + MyTimeb);
                    riseTime = Math.round(res.data.sys.sunrise);
                    setTime = Math.round(res.data.sys.sunset);
                    riseTimeP = Math.round(riseTime + MyTimea);
                    setTimeP = Math.round(setTime - MyTimeb);

                    console.log("INFO SunriseSunset: riseTime = " + riseTime);
                    console.log("INFO SunriseSunset: setTime = " + setTime);
                    console.log("INFO SunriseSunset: riseTimeP = " + riseTimeP);
                    console.log("INFO SunriseSunset: setTimeP = " + setTimeP);
                } catch (e) {
                    self.controller.addNotification("error", "Cannot parse sunset and sunrise times!", "module");
                    console.log("INFO SunriseSunset: Cannot Parse sunrise/sunset times");
                }           
            }
        });
    };
	
    this.fetchSunriseSunset = function() {	
        vDev = this.config.switches;

        sEpoch = Math.round((+new Date()) / 1000);

        console.log("INFO SunriseSunset: Epoch = " + sEpoch);
        try {
            console.log("INFO SunriseSunset: Sunrise = " + riseTime + " " + sEpoch + " " + riseTimeP);
            console.log("INFO SunriseSunset: Sunset = " + setTime + " " + sEpoch + " " + setTimeP);
        } catch (e) {
            this.controller.addNotification("error", "No sunrise or sunset times present!", "module");
            console.log("INFO SunriseSunset: No Sunrise/Sunset times present!");
        }
        if ((sEpoch >= riseTime) && (sEpoch <= riseTimeP)) {
            console.log("INFO SunriseSunset set off: " + sEpoch + " >= " + riseTime + " && " + sEpoch + " <= " + riseTimeP); 
            self.config.switches.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    console.log("INFO SunriseSunset vDev switch command off: " + vDev);
                    vDev.performCommand("off");
                }
            });
             self.config.dimmers.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    status = 0; // Set dimmer level to zero to turn it off.
                    console.log("INFO SunriseSunset vDev dimmer command off: " + vDev);  
                    vDev.performCommand("exact", { level: status });
                }
            });
        } else if ((sEpoch <= setTime) && (sEpoch >= setTimeP)) {
            console.log("INFO SunriseSunset set on: " + sEpoch + " <= " + setTime + " && " + sEpoch + " >= " + setTimeP);
            self.config.switches.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    console.log("INFO SunriseSunset vDev switch command on: " + vDev);
                    vDev.performCommand("on");
                }
            });
            self.config.dimmers.forEach(function(devState) {
                var vDev = self.controller.devices.get(devState.device);
                if (vDev) {
                    console.log("INFO SunriseSunset vDev dimmer command on: " + vDev);
                    vDev.performCommand("exact", { level: devState.status });
                }
            });
        }
    };

    this.SunriseSunset(self);

    this.onEpoch = function() {
        self.fetchSunriseSunset(self);
    };

    this.onSunriseSunset = function() {
        self.SunriseSunset(self);
    };

    this.controller.on("SunriseSunset.poll", this.onSunriseSunset);

    this.controller.emit("cron.addTask", "SunriseSunset.poll", {
        minute: ms,
        hour: hs,
        weekDay: null,
        day: null,
        month: null
    });

    this.controller.on("myEpoch.poll", this.onEpoch);

    this.controller.emit("cron.addTask", "myEpoch.poll", {
        minute: me,
        hour: he,
        weekDay: null,
        day: null,
        month: null
    });
};



SunriseSunset.prototype.stop = function () {
    SunriseSunset.super_.prototype.stop.call(this);

    if (this.vDev) {
        this.controller.devices.remove(this.vDev.id);
        this.vDev = null;
    }

    this.controller.emit("cron.removeTask", "myEpoch.poll");
    this.controller.emit("cron.removeTask", "SunriseSunset.poll");

    this.controller.off("SunriseSunset.poll", this.onSunriseSunset);	
    this.controller.off("myEpoch.poll", this.onEpoch);

    var self = null;
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

// This module does not have any methods.
