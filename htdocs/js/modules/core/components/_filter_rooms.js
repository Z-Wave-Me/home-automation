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
                locationsBinding = binding.sub('locations'),
                locations = locationsBinding.val();

            return _.div({className: 'secondary-filters'},
                locations.map(function (item) {
                    return _.div({
                        ref: 'secondaryFilter',
                        onClick: that.setSecondaryFilter.bind(null, item.get('id')),
                        className: secondaryFilter === item.get('id') ? 'secondary-filter selected' : 'secondary-filter',
                        key: item.get('id')
                    }, item.get('title'));
                }).toArray()
            )
        }
    });
});
