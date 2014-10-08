define([
    // libs

    'morearty'
], function (
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                metrics_binding = binding.sub('metrics'),
                title = metrics_binding.val('title'),
                level = Sticky.get('App.Helpers.JS').isFloat(metrics_binding.val('level')) ?
                    binding.sub('metrics').val('level').toFixed(1) : metrics_binding.val('level'),
                scaleTitle =
                        binding.sub('metrics').hasOwnProperty('scaleTitle') &&
                    String(metrics_binding.val('scaleTitle')).length > 0 ?
                            ' ' + String(metrics_binding.val('scaleTitle')) : '';

            return (
                _.div({className: 'content'},
                    _.span({className: 'title-container'}, title),
                    _.span({className: 'value-field'},
                        _.span({className: 'probe-value'}, level + scaleTitle)
                    )
                )
            );
        }
    });
});
