define([
    //libs
    'backbone',
    'models/notice'
], function (Backbone, NoticeM) {
    'use strict';
    var NotificationsCollection =  Backbone.Collection.extend({
        // model reference
        model: NoticeM,
        methodToURL: {
            'read': '/notifications/',
            'create': '/notifications/',
            'update': '/notifications/',
            'delete': '/notifications/'
        },

        url: function () {
            var url = this.id !== undefined ? '/' + this.id : '';
            return url;
        },

        sync: function (method, model, options) {
            options = options || {};
            options.url = model.methodToURL[method.toLowerCase()] + this.url();

            if (this.updateTime !== undefined) {
                options.data = {since: this.updateTime};
            }

            Backbone.sync(method, model, options);
        },

        parse: function (response, xhr) {
            this.updateTime = response.data.updateTime;
            return response.data.notifications;
        },

        initialize: function () {
           log('Init notifications');
        }

    });

    return NotificationsCollection;

});