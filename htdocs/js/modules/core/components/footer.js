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
                    var state = this.getState(),
                        _ = that.Ctx.React.DOM;

                    return _.footer({ id: 'footer-region', className: 'clearfix' },
                        _.div({className: 'left-button-container'},
                            _.span({className: 'settings-button'}),
                            _.span({className: 'settings-label'}, 'Rearrange & Settings')
                        )
                    );
                }
            });
        }
    });
});
