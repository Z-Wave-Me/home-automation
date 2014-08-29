define([
    // components
], function (
    // components
    ) {
    'use strict';

    return function (Ctx, _options, components) {
        var that = this,
            _base_mixin = components['_base_mixin'],
            options = _options || {};

        return Ctx.createClass({
            mixins: [_base_mixin],
            render: function () {
                var state = this.getState(),
                    preferences_tree = state.sub('preferences').sub('tree'),
                    _ = Ctx.React.DOM;

                return _.div({ className: 'main-component' },
                    _.div({ className: 'line-container'},
                        _.div({ className: 'main-menu-item', onClick: this.setActiveNode.bind(null, 2)},
                            _.span({ className: 'container-icon general-icon'}),
                            _.span({ className: 'title-menu-item'}, 'GENERAL')
                        ),
                        _.div({ className: 'main-menu-item', onClick: this.setActiveNode.bind(null, 3)},
                            _.span({ className: 'container-icon rooms-icon'}),
                            _.span({ className: 'title-menu-item'}, 'ROOMS')
                        ),
                        _.div({ className: 'main-menu-item', onClick: this.setActiveNode.bind(null, 4)},
                            _.span({ className: 'container-icon switch-icon'}),
                            _.span({ className: 'title-menu-item'}, 'WIDGETS')
                        )
                    ),
                    _.div({ className: 'line-container'},
                        _.div({ className: 'main-menu-item', onClick: this.setActiveNode.bind(null, 5)},
                            _.span({ className: 'container-icon modules-icon'}),
                            _.span({ className: 'title-menu-item'}, 'AUTOMATION')
                        )
                    )
                );
            }
        });
    }
});
