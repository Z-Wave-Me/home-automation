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
        getClass: function (state) {
            return this.MoreartyClass({state: state});
        },
        _createClass: function () {
            var that = this,
                Base = new BaseComponent({}, that.Ctx);

            that.MoreartyClass = that.Ctx.createClass({
                back: function () {
                    var state = this.getState();
                    console.log('Back!');
                },
                closeOverlay: function () {
                    var state = this.getState();
                    state.set('overlayShow', false);
                },
                render: function () {
                    var _ = that.Ctx.React.DOM,
                        state = this.getState(),
                        overlay_show = state.val('overlayShow'),
                        overlay_name = state.val('overlayShowName');

                    return (
                        _.div({
                                className: overlay_show ? ['overlay', 'show'].join(' ') : 'overlay',
                                    'data-overlay-name': overlay_name || 'default'
                            },
                            _.div({className: 'overlay-wrapper'},
                                _.div({className: 'overlay-top'},
                                    _.div({className: 'overlay-left-top-panel overlay-top-panel'},
                                        _.span({className: 'overlay-back-button', onClick: this.back}, '←')
                                    ),
                                    _.div({className: 'overlay-center-top-panel overlay-top-panel'},
                                        _.span({className: 'overlay-close-button', onClick: this.closeOverlay}, '✖')
                                    ),
                                    _.div({className: 'overlay-right-top-panel overlay-top-panel'})
                                ),
                                Base.getClass(this.getState())
                            )
                        )
                    );
                }
            });
        }
    });
});
