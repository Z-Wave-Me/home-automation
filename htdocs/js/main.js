var vers = 1;

requirejs.config({
    baseUrl: "js",
    paths : {
        backbone : 'libs/backbone/backbone-min',
        underscore : 'libs/backbone/underscore-min',
        jquery : 'libs/vendor/jquery-2.0.3.min',
        cookie : 'libs/vendor/jquery.cookie',
        dragsort : 'libs/vendor/jquery.dragsort',
        magicsuggest: 'libs/vendor/magicsuggest-1.3.1',
        drags: 'libs/vendor/jquery.draggable',
        text: 'libs/require/requirejs-text',
        templates: '../templates'
    },
    shim : {
        jquery : {
            exports : '$'
        },
        cookie : {
            deps: ['jquery'],
            exports : '$.cookie'
        },
        dragsort : {
            deps: ['jquery'],
            exports : '$.dragsort'
        },
        magicsuggest: {
            deps: ['jquery'],
            exports: '$.magicsuggest'
        },
        drags: {
            deps: ['jquery'],
            exporst: '$.drags'
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