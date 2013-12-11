define([
    "helpers/apis",
    "backbone"
], function (Apis, Backbone) {
    'use strict';
    var WidgetsView = Backbone.View.extend({
        el: '#widgets-region.widgets',
        initialize: function () {
            _.bindAll(this, 'render');
            var that = this;
            that.Devices = window.App.Devices;
            that.Locations = window.App.Locations;
            that.Filters = {
                type: 'rooms', // type: rooms, types, tags,
                subType: 'all' // rooms: All, Garage, Kitchen, Hall, Bedroom, Kids
            };
        },
        render: function () {
            var that = this;
        }
    });

    return WidgetsView;
});