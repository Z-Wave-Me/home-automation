define([
    //libs
    'backbone',
    './components/base'
], function (
    // libs
    Backbone,
    BaseWidgetView
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
                BaseWidget = new BaseWidgetView({}, that.Ctx);

            that.MoreartyClass = that.Ctx.createClass({
                render: function () {
                    var _ = that.Ctx.React.DOM,
                        state = this.getState(),
                        itemsBinding = state.sub('devices'),
                        items = itemsBinding.val(),
                        renderWidget;

                    renderWidget = function (item, index) {
                        return BaseWidget.getClass({ state: itemsBinding.sub(index) })
                    };

                    return _.section({id: 'widgets-container', className: 'widgets'},
                        items.map(renderWidget).toArray()
                    );
                }
            });
        }
    });
});
