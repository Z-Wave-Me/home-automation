define([
    //libs
    'director'
], function (
    // libs
    Director
    ) {
    'use strict';

    var RouterModule = new function(options_, context) {
        var RouterModule = function (options_, context) {
            this._init(options_, context);
        };

        RouterModule.prototype = {
            constructor: RouterModule,
            _init: function (options_, context) {
                this.extend = Sticky.get('App.Helpers.JS').extend;
                this.options = this.extend({}, options_);
                this.context = context;
                this.NOW_SHOWING = Object.freeze({
                    DASHBOARD: 'dashboard',
                    WIDGETS: 'widget'
                });
                this.run();
            },
            run: function () {
                var that = this;
                that.context.createClass({
                    componentDidMount: function () {
                        var state = this.getState();
                        Router({
                            '/': state.set.bind(state, 'nowShowing', this.NOW_SHOWING.DASHBOARD),
                            '/dashboard': state.set.bind(state, 'nowShowing', this.NOW_SHOWING.DASHBOARD),
                            '/widgets': state.set.bind(state, 'nowShowing', this.NOW_SHOWING.WIDGETS)
                        }).init();
                    },
                    render: function () {
                        console.log('123');
                    }
                });
            }
        };

        return RouterModule;
    };

    return RouterModule;
});

