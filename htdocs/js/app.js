define([
    'marionette',
    'backbone',
    'layout',
    'helpers/bb-sync'
], function (Marionette, Backbone, Layout, bbSync) {
    'use strict';
    var App,
        addJqueryMethod,
        preFilterAjax,
        ReplaceRegion,
        layout = new Layout(),
        apiPort = '10483',
        apiHost = 'mskoff.z-wave.me';

    App = new Backbone.Marionette.Application();
    App.vars = {
        apiPort : qVar("port") || window.location.port,
        apiHost : qVar("host") || window.location.hostname
    };


    ReplaceRegion = Marionette.Region.extend({
        open: function (view) {
            this.$el.replaceWith(view.el);
        }
    });

    App.addRegions({
        headerRegion: {
            selector: "#header-region",
            regionType: ReplaceRegion

        },
        mainRegion: {
            selector: "#main-region",
            regionType: ReplaceRegion
        },
        footerRegion: {
            selector: "#footer-region",
            regionType: ReplaceRegion

        },
        widgetsRegion: {
            selector: "#widgets-region",
            regionType: ReplaceRegion

        }
    });

    App.vent.on("routing:started", function() {
        Backbone.sync = bbSync;
        addJqueryMethod();
        preFilterAjax();

        // if IE
        if (!Modernizr.history) {

            // initialize router/Backbone.history, but turn off route parsing,
            // since non-window.history parsing will look for a hash, and not finding one,
            // will break our shit.
            Backbone.history.start({ silent: true, hashChange: true });

            // convert any post-# elements to a standard URL to be parsed by our router
            var subroute = window.location.hash.replace('#', '/').split('?')[0],
                route = window.location.pathname + subroute;

            Backbone.history.loadUrl(route);
        } else {
            Backbone.history.start({ pushState: true, silent: true });
            Backbone.history.loadUrl(Backbone.history.getFragment().split('?')[0]);
        }
    });

    addJqueryMethod =  function () {
        $.fn.serializeObject = function () {
            var o = {},
                a = this.serializeArray();
            $.each(a, function () {
                if (o[this.name] !== undefined) {
                    if (!o[this.name].push) {
                        o[this.name] = [o[this.name]];
                    }
                    o[this.name].push(this.value || '');
                } else {
                    o[this.name] = this.value || '';
                }
            });
            return o;
        };

        $.fn.doVisibleRange = function () {
            return this.each(function () {
                var $this = $(this),
                    value = ($this.val() - $this.attr('min')) / ($this.attr('max') - $this.attr('min'));
                $this.css('background-image', '-webkit-gradient(linear,left top,  right top, color-stop(' + value + ', rgb( 64, 232, 240 )), color-stop(' + value + ', rgb( 190, 190, 190 )))');
            });
        };
    };

    preFilterAjax = function () {
        $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
            // Your server goes below
            var apiUrl = "http://" + apiHost + ":" + apiPort + "/ZAutomation/api" + options.url;

            options.url = apiUrl;
            options.crossDomain = {
                crossDomain: true
            };

        });
    }

    layout.render();
    App.start();

    return App;
});