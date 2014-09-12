define([
    // libs
    'react',
    'morearty',
    // mixins
    'mixins/data/data-layer',
    // components
    './_base_widget'
], function (
    // libs
    React,
    Morearty,
    // mixins
    DataLayerMixin,
    // components
    _base_widget
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, DataLayerMixin],
        getWidget: function () {
            var selectedId = this.getBinding('preferences').val('leftPanelItemSelectedId'),
                device = this.getModelFromCollection(selectedId, 'devices');
        },
        render: function () {
            var binding = this.getDefaultBinding(),
                _ = React.DOM;

            this.getWidget();
            return _.div({ className: 'main-component' }, 'MainWidgets');
        }
    });
});
