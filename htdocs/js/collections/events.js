define([
    //libs
    'backbone',
    'models/event'
], function(Backbone, EventM) {

    var EventsCollection =  Backbone.Collection.extend({
        // model reference
        model: EventM,
        methodToURL: {
            'read': '/events/',
            'create': '/events/',
            'update': '/events/',
            'delete': '/events/'
        },

        url: function(){
            var url = this.updateTime !== undefined ? '?since=' + this.updateTime : '?since=0';
            return url;
        },

        sync: function(method, model, options) {
            options = options || {};
            options.url = model.methodToURL[method.toLowerCase()] + this.url();

            Backbone.sync(method, model, options);
        },

        parse: function(response, xhr) {
            var events = []
            _.each(response.data.events, function(eventsTimestamp){
                for (var key in eventsTimestamp) {
                    if (eventsTimestamp[key][0] == 'device.metricUpdated') {
                        var event = {
                            eventType: eventsTimestamp[key][0],
                            metrics: _.rest(eventsTimestamp[key][1]),
                            id: eventsTimestamp[key][1][0],
                            timestamp: key
                        };
                        events.push(event);
                    }
                }
            });
            return events;
        },

        initialize: function() {
           log('init devices')
        }

    });

    return EventsCollection;

});