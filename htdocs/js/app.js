define([
    'marionette',
    'backbone',
    'layout',
    'helpers/bb-sync'
], function(Marionette, Backbone, Layout, bbSync) {
    'use strict';
    var App,
        addJqueryMethod,
        preFilterAjax,
        ReplaceRegion,
        layout = new Layout();

    var apiPort = '10483',
        apiHost = 'mskoff.z-wave.me';

    App = new Backbone.Marionette.Application();
    App.vars = {
        apiPort : qVar("port") ? qVar("port") : window.location.port,
        apiHost : qVar("host") ? qVar("host") : window.location.hostname
    };


    ReplaceRegion = Marionette.Region.extend({
        open: function(view){
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
        var startingUrl = "/";
        // Browsers without pushState (IE) need the root/page url in the hash
        if (!(window.history && window.history.pushState)) {
            window.location.hash = window.location.pathname.replace(startingUrl, '');
            startingUrl = window.location.pathname;
        }
        Backbone.history.start({ root: startingUrl });
    });

    addJqueryMethod =  function() {
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

        $.fn.doVisibleRange = function() {
            return this.each(function() {
                var $this = $(this);
                var value = ($this.val() - $this.attr('min'))/($this.attr('max') - $this.attr('min'));
                $this.css('background-image', '-webkit-gradient(linear,left top,  right top, color-stop(' + value + ', rgb( 64, 232, 240 )), color-stop(' + value + ', rgb( 190, 190, 190 )))');
            });
        };
    };

    preFilterAjax = function() {
        $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
            // Your server goes below
            var apiUrl = "http://"+apiHost+":"+apiPort+"/ZAutomation/api" + options.url;

            options.url = apiUrl;
            options.crossDomain ={
                crossDomain: true
            };

        });
    }

    layout.render();
    App.start();

    return App;
});