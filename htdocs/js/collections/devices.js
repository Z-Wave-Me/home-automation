define([
    //libs
    'backbone',
    'models/device',
    'crossdomain'
], function(Backbone, DeviceM) {

    var DevicesCollection =  Backbone.Collection.extend({
        // model reference
        model: DeviceM,
        methodToURL: {
            'read': '/devices/',
            'create': '/devices/',
            'update': '/devices/',
            'delete': '/devices/'
        },

        url: function(){
            var url = this.id !== undefined ? '/' + this.id : '';
            return url;
        },

        sync: function(method, model, options) {
            options = options || {};
            options.url = model.methodToURL[method.toLowerCase()] + this.url();

            Backbone.sync(method, model, options);
        },

        parse: function(response, xhr) {
            return response.data;
        },

        initialize: function() {
           log('init devices')
        }

    });

    return DevicesCollection;

});