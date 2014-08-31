define([], function () {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {};

        return Ctx.React.createClass({
            setSecondaryFilter: function (value) {
                this.getDefaultBinding().set('secondaryFilter', value);
                return false;
            },
            render: function () {
                var that = this,
                    binding = this.getDefaultBinding(),
                    _ = Ctx.React.DOM,
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
    }
});
