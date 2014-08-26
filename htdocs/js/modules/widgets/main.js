define([
    //components
    './components/base'
], function (
    // components
    BaseWidgetView
    ) {
    'use strict';

    return function (Ctx, _options) {
        var options = _options || {},
            BaseWidget = new BaseWidgetView(Ctx);

        return Ctx.createClass({
            render: function () {
                var __ = Ctx.React.DOM,
                    state = this.getState(),
                    itemsBinding = state.sub('devices'),
                    items = itemsBinding.val(),
                    renderWidget,
                    isShown,
                    profiles = Sticky.get('App.Modules.ServerSync').getCollection('Profiles'),
                    positions = profiles ? profiles.getActive().get('positions') : [];


                isShown = function (item) {
                    if (state.val('nowShowing') === 'dashboard') {
                        return positions.indexOf(item.get('id')) !== -1 ? true : null;
                    } else {
                        return true;
                    }
                };

                renderWidget = function (item, index) {
                    return isShown(item) ? BaseWidget({ key: index, state: itemsBinding.sub(index) }) : null;
                };

                return __.section({id: 'devices-container', className: 'widgets'},
                    items.map(renderWidget).toArray()
                );
            }
        });
    };
});
