require.config({
    baseUrl: "js/",
    deps: ['main'],
    paths : {
        backbone : 'libs/backbone/backbone-min',
        underscore : 'libs/backbone/underscore-min',
        jquery : 'libs/vendor/jquery-2.1.1.min',
        'jquery-ui': 'libs/vendor/jquery-ui-1.10.4.custom',
        'colpick': 'libs/vendor/jquery.colpick',
        cookie : 'libs/vendor/jquery.cookie',
        dragsort : 'libs/vendor/jquery.dragsort',
        magicsuggest: 'libs/vendor/magicsuggest-1.3.1',
        alpaca: 'libs/alpaca/alpaca-full',
        ace: 'libs/acejs/ace',
        'theme-chrome': 'libs/acejs/theme-chrome',
        'mode-javascript': 'libs/acejs/mode-javascript',
        'mode-json': 'libs/acejs/mode-json',
        'worker-javascript': 'libs/acejs/worker-javascript',
        text: 'libs/require/requirejs-text',
        templates: '../templates'
    },
    shim : {
        jquery : {
            exports : '$'
        },
        'jquery-ui': {
            deps: ['jquery']
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
        },
        ace: {
            deps : ['jquery']
        },
        'mode-javascript': {
            deps : ['ace']
        },
        'mode-json': {
            deps : ['ace']
        },
        'theme-chrome': {
            deps : ['ace']
        },
        'worker-javascript': {
            deps : ['ace']
        },
        alpaca: {
            deps: ['jquery', 'ace', 'mode-javascript', 'mode-json', 'jquery-ui', 'theme-chrome', 'worker-javascript']
        },
        'colpick': {
            deps: ['jquery']
        }
    },
    onBuildWrite: function (moduleName, path, singleContents) {
        return singleContents.replace(/jsx!/g, '');
    },
    optimize: "uglify2",
    uglify: {
        toplevel: true,
        ascii_only: true,
        beautify: true,
        max_line_length: 1000,
        compress: false
    }
});
