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
        componentDidMount: function () {
            var binding = this.getDefaultBinding(),
                dataBinding = this.getBinding('data');

            if (dataBinding.val('locations').toArray().length > 0) {
                binding.set('secondaryFilter', dataBinding.sub('locations').val().get(0).get('id'));
            }
        },
        setSecondaryFilter: function (value) {
            this.getDefaultBinding().set('secondaryFilter', value);
            return false;
        },
        render: function () {
            var that = this,
                binding = this.getDefaultBinding(),
                dataBinding = this.getBinding('data'),
                _ = React.DOM,
                secondaryFilter = binding.val('secondaryFilter'),
                locationsBinding = dataBinding.sub('locations'),
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
