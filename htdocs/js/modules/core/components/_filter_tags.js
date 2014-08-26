define([], function () {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {};

        return Ctx.createClass({
            setSecondaryFilter: function (value) {
                this.getState().set('secondaryFilter', value);
                return false;
            },
            render: function () {
                var that = this,
                    state = this.getState(),
                    _ = Ctx.React.DOM,
                    secondaryFilter = state.val('secondaryFilter'),
                    tagsBinding = state.sub('deviceTags'),
                    tags = tagsBinding.val();

                return _.div({className: 'header-sub-container bottom-filter-container clearfix'},
                    tags
                        .map(function (tag) {
                            return _.div({
                                onClick: that.setSecondaryFilter.bind(null, tag),
                                className: secondaryFilter === tag ? 'secondary-filter selected' : 'secondary-filter',
                                key: tag
                            }, tag);
                        })
                )
            }
        });
    }
});
