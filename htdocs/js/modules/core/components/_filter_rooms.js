define([
    // libs

    'morearty'
], function (
    // libs
    Morearty
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        componentWillMount: function () {
            var that = this;
            that.getBinding('data').addListener('locations', function () {
                if (that.isMounted()) {
                    that.forceUpdate();
                }
            });
        },
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
