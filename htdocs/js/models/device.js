define([
    //libs
    'backbone'
], function(Backbone) {

    return Backbone.Model.extend({

        defaults:{
            deviceSubType: null,
            deviceType: null,
            id: null,
            lock: true,
            metrics: {}
        },

        methodToURL: {
            'read': '/devices/',
            'create': '/devices/',
            'update': '/devices/',
            'delete': '/devices/'
        },

        url: function(){
            var url = '';
            return url;
        },

        sync: function(method, model, options) {
            options = options || {};
            options.url = model.methodToURL[method.toLowerCase()] + this.url();

            Backbone.sync(method, model, options);
        },

        initialize: function () {
            this.bind('error', function (model, err) {
                log("ERROR: " + err);
            });
        }
    });
});