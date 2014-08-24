define([
    //libs
    'backbone'
], function (
    // libs
    Backbone
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
            var that = this;

            that.MoreartyClass = that.Ctx.createClass({
                render: function () {
                    var _ = that.Ctx.React.DOM,
                        state = this.getState(),
                        item = state.val();

                    return (
                            _.div({id: item.get('id'), className: 'widget-small widget-object show clear'},
                                _.div({className: 'border-widget border-widget-sprite small-border'},
                                    _.span({className: 'selection-button border-widget-sprite button-select-border'})
                                ),
                                _.div({className: 'content-widget'},
                                    _.div({className: 'container-icon'},
                                        _.div({className: 'icon-base switch switchBinary'})
                                    ),
                                    _.div({className: 'content'},
                                        _.span({className: 'title-container'}, item.get('metrics').title)
                                    )
                                )
                            )
                        );
                }
            });
        }
    });
});
