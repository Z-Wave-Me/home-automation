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
                tagsBinding = binding.sub('deviceTags'),
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
