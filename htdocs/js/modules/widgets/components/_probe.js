define([
    // libs
    'react',
    'morearty'
], function (
    React,
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                item = binding.val(),
                title = item.get('metrics').title,
                level = Sticky.get('App.Helpers.JS').isFloat(item.get('metrics').level) ? item.get('metrics').level.toFixed(1) : item.get('metrics').level,
                scaleTitle =
                        item.get('metrics').hasOwnProperty('scaleTitle') &&
                    String(item.get('metrics').scaleTitle).length > 0 ? ' ' + String(item.get('metrics').scaleTitle) : '';

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-container'}, title),
                    _.span({className: 'value-field'},
                        _.span({className: 'probe-value'}, level + scaleTitle)
                    )
                )
                )
        }
    });
});
