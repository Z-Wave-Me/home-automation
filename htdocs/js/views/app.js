define([
    'backbone',
    'helpers/bb-sync',
    'collections/devices',
    'collections/locations',
    'collections/notifications',
    'collections/profiles',
    'collections/modules',
    'collections/instances',
    'collections/namespaces'
], function (Backbone, bbSync, Devices, Locations, Notifications, Profiles, Modules, Instances, Namespaces) {
    'use strict';
    return Backbone.View.extend({
        el: 'body',

        initialize: function () {
            var that = this,
                host = null,
                port = null;

            _.bindAll(this, 'render', 'addJqueryMethod', 'preFilterAjax', 'buildStructure');
            log("App Initialize");

            that.apiPort = window.location.port !== "" ? window.location.port : 8083;
            that.apiHost = window.location.hostname;

            that.preFilterAjax();
            that.buildStructure();
            Backbone.sync = bbSync;
            that.addJqueryMethod();
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

            $.fn.exists = function () { return (this.length > 0); };

            $.fn.center = function () {
                this.css("position", "absolute");
                this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 2) +
                    $(window).scrollTop()) + "px");
                this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
                    $(window).scrollLeft()) + "px");
                return this;
            };

            $.fn.top = function () {
                this.css("position","absolute");
                this.css("top", Math.max(0, (($(window).height() - $(this).outerHeight()) / 5) +
                    $(window).scrollTop()) + "px");
                this.css("left", Math.max(0, (($(window).width() - $(this).outerWidth()) / 2) +
                    $(window).scrollLeft()) + "px");
                return this;
            };
        },
        preFilterAjax: function () {
            var that = this;
            $.ajaxPrefilter(function (options, originalOptions, jqXHR) {
                // Your server goes below
                that.apiUrl = "http://" + that.apiHost + ":" + that.apiPort + "/ZAutomation/api/v1" + options.url;

                options.url = that.apiUrl;
                options.crossDomain = {
                    crossDomain: true
                };
            });
        },
        buildStructure: function () {
            if (!window.App) {
                window.App = {
                    Devices: new Devices(),
                    Locations: new Locations(),
                    Tags: {},
                    Notifications: new Notifications(),
                    Profiles: new Profiles(),
                    Modules: new Modules(),
                    Instances: new Instances(),
                    Namespaces: new Namespaces(),
                    API: {
                        HOST: this.apiHost,
                        PORT: this.apiPort,
                        URL: this.apiUrl
                    }
                };
            }

            setInterval(function () {
                window.App.Devices.fetch({
                    remove: false,
                    merge: true,
                    data: {limit: 0}
                });

                window.App.Notifications.fetch({
                    remove: false,
                    merge: true
                });
            }, 1000);

            window.App.Locations.fetch({
                remove: false,
                merge: true
            });

            window.App.Profiles.fetch({
                remove: false,
                merge: true
            });

            window.App.Namespaces.fetch({
                remove: false,
                merge: true,
                success: function () {
                    window.App.Modules.fetch({
                        remove: false,
                        merge: true
                    });

                    window.App.Instances.fetch({
                        remove: false,
                        merge: true
                    });
                }
            });
        }
    });
});
