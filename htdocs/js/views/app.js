define([
    'marionette',
    'backbone',
    '../layout',
    'helpers/bb-sync'
], function (Marionette, Backbone, Layout, bbSync) {
    'use strict';
    var App,
        addJqueryMethod,
        preFilterAjax,
        ReplaceRegion,
        layout = new Layout(),
        apiPort = window.location.port,
        apiHost = window.location.hostname;

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
            regionType: ReplaceRegion,
            anotherRegion: "#main-region"
        }
    });

    App.vent.on("routing:started", function() {
        Backbone.sync = bbSync;
        addJqueryMethod();
        preFilterAjax();
        if (!Modernizr.history) {
            Backbone.history.start({ pushState: Modernizr.history });
        } else {
            Backbone.history.start();
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
