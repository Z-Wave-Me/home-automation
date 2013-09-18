var eventLogUpdateTimer;
var eventLogUpdateTimerErrors = 0;
var eventLogUpdateTime = 0;

var events = new EventEmitter2({
    wildcard: true
});

function requestEventLogUpdate () {
    apiRequest("/events/?since="+eventLogUpdateTime, function (err, data) {
        if (!!err) {
            eventLogUpdateTimerErrors++;
            console.log("Cannot grab event log:", eventLogUpdateTime, err.message, "(got", eventLogUpdateTimerErrors, "update failures)");
            return;
        }

        eventLogUpdateTime = data.updateTime;
        Object.keys(data.events).forEach(function (timestamp) {
            var chunk = data.events[timestamp];
            chunk.forEach(function (event) {
                events.emit.apply(events, [event[0]].concat(event[1]));
            });
        });
    });
}

$(document).ready(function () {
    eventLogUpdateTimer = setInterval(requestEventLogUpdate, 1000);
});
