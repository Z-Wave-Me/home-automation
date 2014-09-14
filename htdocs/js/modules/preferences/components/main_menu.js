define([
    // libs
    'react',
    'morearty',
    // mixins
    '../mixins/base_mixin'
], function (
    // libs
    React,
    Morearty,
    // mixins
    base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin],
        render: function () {
            var _ = React.DOM;

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
});
