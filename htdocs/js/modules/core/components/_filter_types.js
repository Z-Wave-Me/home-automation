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

            if (dataBinding.val('deviceTypes').length > 0) {
                binding.set('secondaryFilter', dataBinding.val('deviceTypes')[0]);
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
                typesBinding = dataBinding.sub('deviceTypes'),
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
