var vers = 1;

requirejs.config({
    baseUrl: "js",
    paths : {
        backbone : 'libs/backbone/backbone-min',
        underscore : 'libs/backbone/underscore-min',
        jquery : 'libs/vendor/jquery-2.0.3.min',
        'jquery-cookie' : 'libs/vendor/jquery.cookie',
        text: 'libs/require/requirejs-text',
        templates: '../templates'
    },
    shim : {
        jquery : {
            exports : '$'
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
        }
    },
    urlArgs: "v=" + vers
});

require([
    'backbone',
    'views/app',
    'router',
    'vm'
], function (Backbone, AppView, Router, Vm) {
    'use strict';
    AppView = Vm.create({}, 'AppView', AppView);
    Router.initialize({appView: AppView});
    AppView.render();
});