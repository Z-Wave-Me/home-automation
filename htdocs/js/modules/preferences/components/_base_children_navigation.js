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
                    activeNode = this.getActiveNodeTree(),
                    preferences_tree = state.sub('preferences'),
                    _ = Ctx.React.DOM;

                return _.div({ className: 'base-children-component clearfix' });
            }
        });
    }
});
