define([
    //libs
], function (
    // libs
    ) {
    'use strict';

    return function (Ctx, _options, components) {
        var that = this,
            options = _options || {};

        return Ctx.createClass({
            mixins: components['_base_mixin'],
            render: function () {
                var state = this.getState(),
                    activeNode = this.getActiveNode(),
                    _ = Ctx.React.DOM;

                return _.div({ className: 'button-container-component' },
                    activeNode[0].buttons.indexOf('add') !== -1 ? _.button({ className: 'add-button' }) : null,
                    activeNode[0].buttons.indexOf('remove') !== -1 ? _.button({ className: 'remove-button' }) : null,
                    activeNode[0].buttons.indexOf('duplicate') !== -1 ? _.button({ className: 'duplicate-button' }) : null
                );
            }
        });
    }
});
