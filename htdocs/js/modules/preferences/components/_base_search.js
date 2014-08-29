define([
    //libs
], function (
    // libs
    ) {
    'use strict';

    return function (Ctx, _options) {
        var that = this,
            options = _options || {};

        return Ctx.createClass({
            setSearchString: function (event) {
                var search_string = event.target.value;
                this.getState().sub('preferences').set('searchString', search_string);
            },
            render: function () {
                var state = this.getState(),
                    _ = Ctx.React.DOM;

                return _.div({ className: 'base-search-component' },
                    _.input({
                        className: 'search-input',
                        type: 'search',
                        placeholder: 'search',
                        onKeyPress: Ctx.Callback.onKey(this.setSearchString)
                    })
                );
            }
        });
    }
});
