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

            if (dataBinding.val('deviceTags').length > 0) {
                binding.set('secondaryFilter', dataBinding.val('deviceTags')[0]);
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
                tagsBinding = dataBinding.sub('deviceTags'),
                tags = tagsBinding.val();

            return (
                _.div({className: 'secondary-filters'},
                    tags
                        .map(function (tag) {
                            return _.div({
                                onClick: that.setSecondaryFilter.bind(null, tag),
                                className: secondaryFilter === tag ? 'secondary-filter selected' : 'secondary-filter',
                                key: tag
                            }, tag);
                        })
                )
            )
        }
    });
});
