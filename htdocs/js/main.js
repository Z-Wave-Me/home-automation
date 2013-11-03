var vers = 1;
'use strict';

requirejs.config({
    baseUrl: "js",
    paths : {
        backbone : 'libs/backbone.marionette/backbone',
        crossdomain: "libs/backbone.marionette/Backbone.CrossDomain",
        underscore : 'libs/backbone.marionette/underscore-min',
        jquery : 'libs/backbone.marionette/jquery',
        'jquery-cookie' : 'libs/backbone.marionette/jquery.cookie',
        marionette : 'libs/backbone.marionette/core/amd/backbone.marionette.min',
        'backbone.wreqr' : 'libs/backbone.marionette/backbone.wreqr.min',
        'backbone.eventbinder' : 'libs/backbone.marionette/backbone.eventbinder.min',
        'backbone.babysitter' : 'libs/backbone.marionette/backbone.babysitter.min',
        text: 'libs/require/requirejs-text',
        templates: '../templates'
    },
    shim : {
        jquery : {
            exports : 'jQuery'
        },
        'jquery-cookie' : {
            deps: ['jquery'],
            exports : '$.cookie'
        },
        underscore : {
            exports : '_'
        },
        backbone : {
            deps : ['jquery', 'underscore'],
            exports : 'Backbone'
        },
        'backbone.babysitter': {
            deps : ['backbone']
        },
        'backbone.eventbinder': {
            deps : ['backbone']
        },
        'backbone.wreqr': {
            deps : ['backbone']
        },
        marionette: {
            deps : ['backbone', 'backbone.wreqr', 'backbone.eventbinder', 'backbone.babysitter'],
            exports : 'Backbone.Marionette'
        }
    },
    urlArgs: "v=" + vers
})

define(['app', 'routers/appRouter', "crossdomain"], function(App, appRouter) {
    App.addInitializer(function() {
        App.Router = new appRouter;
        return App.vent.trigger("routing:started");
    });
    return App.start();
});