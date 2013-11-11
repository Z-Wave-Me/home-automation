define([
    'backbone',
    'helpers/bb-sync',
    'layout'
], function (Backbone, bbSync, Layout) {
    'use strict';
    return Backbone.View.extend({
        el: 'body',

        initialize: function () {
            var that = this;
            _.bindAll(this, 'render', 'addJqueryMethod', 'preFilterAjax');
            log("App Initialize");

            that.apiPort = '10483';
            that.apiHost = 'mskoff.z-wave.me';
            that.Layout = new Layout();

            that.vars = {
                apiPort : qVar("port") || window.location.port,
                apiHost : qVar("host") || window.location.hostname
            };

            Backbone.sync = bbSync;
            that.addJqueryMethod();
            that.preFilterAjax();
            that.Layout.render();
        },
        render: function () {
            log('Render app.js...');
            if (!Modernizr.history) {
                Backbone.history.start({ pushState: Modernizr.history });
            } else {
                Backbone.history.start();
            }
        },
        addJqueryMethod :  function () {
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
        },
        preFilterAjax: function () {
            var that = this;
            $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
                // Your server goes below
                var apiUrl = "http://" + that.apiHost + ":" + that.apiPort + "/ZAutomation/api" + options.url;

                options.url = apiUrl;
                options.crossDomain = {
                    crossDomain: true
                };
            });
        }
    });
});
