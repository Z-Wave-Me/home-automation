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
            render: function () {
                var state = this.getState(),
                    preferences_tree = state.sub('preferencesTree'),
                    preferences_options = state.sub('preferencesOptions'),
                    _ = Ctx.React.DOM;

                return _.div({ className: 'main-component' }, 'MainWidgets');
            }
        });
    }
});
