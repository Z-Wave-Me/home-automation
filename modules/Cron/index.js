/*** Cron ZAutomation module **************************************************

Version: 1.0.0
(c) Z-Wave.Me, 2013
-------------------------------------------------------------------------------
Authors:
   Serguei Poltorak <ps@z-wave.me>
   Gregory Sitnin <sitnin@z-wave.me>

Description:
   This modules impements Unix cron like scheduler.

Emits:
  - [any event asked by other modules]

Listens:
  - cron.addTask
    - String: emitted event name
    - Object: task schedule
      - Mixed (null = any; [from, to, divider]; Number = exact): minute
      - Mixed: hour
      - Mixed: weekDay
      - Mixed: day
      - Mixed: month
    - Mixed (null; Array): eventArguments
  - cron.removeTask
    - String: emitted event name to be removed

******************************************************************************/

// ----------------------------------------------------------------------------
// --- Class definition, inheritance and setup
// ----------------------------------------------------------------------------

function Cron (id, controller) {
    // Call superconstructor first (AutomationModule)
    Cron.super_.call(this, id, controller);

    // Create instance variables
    this.schedules = {};
    this.timer;
    this.bounds = {
        minute: {
            from: 0,
            to: 59
        },
        hour: {
            from: 0,
            to: 23
        },
        day: {
            from: 0,
            to: 30
        },
        weekDay: {
            from: 0,
            to: 6
        },
        month: {
            from: 0,
            to: 11
        }
    };
    this.shift = {
        minute: 0,
        hour: 0,
        day: 1,
        weekDay: 0,
        month: 1
    };
    this.lastFired = 0;
}

inherits(Cron, AutomationModule);

_module = Cron;

// ----------------------------------------------------------------------------
// --- Module instance initialized
// ----------------------------------------------------------------------------

Cron.prototype.init = function (config) {
    // Call superclass' init (this will process config argument and so on)
    Cron.super_.prototype.init.call(this, config);

    // Remember "this" for detached callbacks (such as event listener callbacks)
    var self = this;

    // Setup metric update event listener
    this.controller.on('cron.addTask', function (eventName, schedule, eventArgs) {
      if (!self.schedules.hasOwnProperty(eventName)) {
        self.schedules[eventName] = [];
      }
      self.schedules[eventName].push([self.renderSchedule(schedule), eventArgs]);
    });

    this.controller.on('cron.removeTask', function (eventName) {
      delete self.schedules[eventName];
    });

    this.timer = setInterval(function () {
        var date = new Date();
        var timestampMin = Math.floor(date.getTime() / 60000);

        if (self.lastFired === timestampMin)
            return; // this minute is already handled

        self.lastFired = timestampMin;
        var curTime = {
            minute: date.getMinutes(),
            hour: date.getHours(),
            day: date.getDate(),
            weekDay: date.getDay(), // NOTE! Sunday is 0. Handle this in the UI!!!! !@#%^&
            month: date.getMonth()
        };

        Object.keys(self.schedules).forEach(function (eventName) {
            var schedules_arr = self.schedules[eventName];

            schedules_arr.forEach(function (schedule_pair) {
                var flag = true;

                var keys = ["minute", "hour", "day", "weekDay", "month"];
                for (var k = 0; k < keys.length; k++) {
                    if (-1 === schedule_pair[0][keys[k]].indexOf(curTime[keys[k]])) {
                        flag = false;
                        break;
                    }
                }

                if (flag) {
                    self.controller.emit.apply(self.controller, [eventName].concat(schedule_pair[1]));
                }
            });
        });
    }, 1000);
};

// ----------------------------------------------------------------------------
// --- Module methods
// ----------------------------------------------------------------------------

Cron.prototype.renderTimeRange = function (range, bounds, shift) {
    var r = [], f, t, s;

    if (range === null) {
        f = bounds.from;
        t = bounds.to;
        s = 1;
    } else if (typeof(range) === "number") {
        if (range - shift < bounds.from || range - shift > bounds.to) {
            console.log("ERROR: value " + range.toString() + " is out of range " + bounds.from.toString() + ".." + bounds.to.toString());
            return [];
        }
        f = range - shift;
        t = range - shift;
        s = 1;
    } else if (typeof(range) === "object" && Array.isArray(range) && range.length == 3) {
        if (range[0] - shift < bounds.from || range[1] - shift > bounds.to || range[0] > range[1]) {
            console.log("ERROR: value " + range[0].toString() + ".." + range[1].toString() + " is should not be outside of range " + bounds.from.toString() + ".." + bounds.to.toString());
            return [];
        }
        f = range[0] - shift;
        t = range[1] - shift;
        s = range[2];
    }

    for (var n = f; n <= t; n+=s) {
        r.push(n);
    }

    return r;
};

Cron.prototype.renderSchedule = function (schedule) {
    var renderedSchedule = {};

    var self = this;

    ["minute", "hour", "day", "weekDay", "month"].forEach(function(key) {
        renderedSchedule[key] = self.renderTimeRange(schedule[key], self.bounds[key], self.shift[key]);
    });

    return renderedSchedule;
};
