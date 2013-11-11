define([
    "app",
    "helpers/apis",
    "backbone",
    "collections/devices"
], function (App, Apis, Backbone, Devices) {
    'use strict';
    var ApplicationsView = Backbone.View.extend({
        el: '#widgets-region.widgets',
        initialize: function () {
            _.bindAll(this, 'render');
            var that = this;
        },
        render: function () {
            var that = this;
            log('applications');
        }
    });

    return ApplicationsView;
});