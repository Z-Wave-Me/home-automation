define([
    // libs
    'react',
    'morearty'
], function (
    // libs
    React,
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        setSecondaryFilter: function (value) {
            this.getDefaultBinding().set('secondaryFilter', value);
            return false;
        },
        render: function () {
            var that = this,
                binding = this.getDefaultBinding(),
                _ = React.DOM,
                secondaryFilter = binding.val('secondaryFilter'),
                typesBinding = binding.sub('deviceTypes'),
                types = typesBinding.val();

            return _.div({className: 'secondary-filters'},
                types
                    .map(function (type) {
                        return _.div({
                            onClick: that.setSecondaryFilter.bind(null, type),
                            className: secondaryFilter === type ? 'secondary-filter selected' : 'secondary-filter',
                            key: type
                        }, type);
                    })
            )
        }
    });
});
