({
    baseUrl: "../htdocs/js",
    paths: {
        backbone : 'libs/backbone/backbone-min',
        underscore : 'libs/backbone/underscore-min',
        jquery : 'libs/vendor/jquery-2.1.0.min',
        'jquery-ui': 'libs/vendor/jquery-ui-1.10.4.custom.min',
        'colpick': 'libs/vendor/jquery.colpick',
        cookie : 'libs/vendor/jquery.cookie',
        dragsort : 'libs/vendor/jquery.dragsort',
        magicsuggest: 'libs/vendor/magicsuggest-1.3.1',
        alpaca: 'libs/alpaca/alpaca-full.min',
        ace: 'libs/acejs/ace',
        'theme-chrome': 'libs/acejs/theme-chrome',
        'mode-javascript': 'libs/acejs/mode-javascript',
        'mode-json': 'libs/acejs/mode-json',
        'worker-javascript': 'libs/acejs/worker-javascript',
        text: 'libs/require/requirejs-text',
        templates: '../templates',
    },
    name: "main",
    out: "../htdocs/build/js/main.js"
})
