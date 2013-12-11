define([
    "helpers/apis",
    "backbone",
    "collections/devices"
], function (App, Apis, Backbone, Devices) {
    'use strict';
    var WidgetsView = Backbone.View.extend({
        el: '#widgets-region.widgets',
        initialize: function () {
            _.bindAll(this, 'render');
            var that = this;
        },
        render: function () {
            var that = this;
        }
    });

    return WidgetsView;
});