define([
    //libs
    'backbone'
], function(Backbone) {

    return Backbone.Model.extend({

        defaults:{
            id: null
        },

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

        initialize: function () {
            this.bind('error', function (model, err) {
                log("ERROR: " + err);
            });
        }
    });
});