define([
    // libs
    'backbone',
    // components
    './components/base'
], function (
    // libs
    Backbone,
    // components
    BaseComponent
    ) {
    'use strict';

    return Backbone.View.extend({
        initialize: function (options, context) {
            _.bindAll(this, '_createClass', 'getClass');
            var that = this;

            _.extend(that, {
                options: _.extend({}, options || {}),
                Ctx: context
            });

            that._createClass();
        },
        getClass: function () {
            return this.MoreartyClass;
        },
        _createClass: function () {
            var that = this,
                Base = new BaseComponent({}, that.Ctx);

            that.MoreartyClass = that.Ctx.createClass({

                render: function () {
                    var __ = that.Ctx.React.DOM,
                        state = this.getState(),
                        overlay_show = state.val('overlayShow'),
                        overlay_name = state.val('overlayShowName');

                    return __.div({ className: overlay_show ? ['overlay', 'show'].join(' ') : ['overlay', 'hide'].join(' '), 'data-overlay-name': overlay_name || 'default'},
                        Base.getClass(this.getState())
                    );
                }
            });
        },
        _routes: Object.freeze({
            'DASHBOARD': 'dashboard',
            'WIDGETS': 'widgets'
        })
    });
});
