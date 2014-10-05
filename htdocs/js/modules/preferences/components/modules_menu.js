define([
    // libs
    'morearty',
    // components
    './common/_base_search',
    // mixins
    '../mixins/base_mixin',
    'mixins/data/data-layer',
    'mixins/sync/sync-layer',
    'alpaca'
], function (
    // libs
    Morearty,
    // components
    _base_search,
    // mixins
    base_mixin,
    data_layer_mixin,
    sync_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin, data_layer_mixin, sync_layer_mixin],
        componentWillMount: function () {
            this.getBinding('preferences').atomically()
                .set('step', 0)
                .commit();
        },
        componentWillUnmount: function () {
            this.getBinding('preferences').atomically()
                .delete('step')
                .commit();
        },
        render: function () {
            var _ = React.DOM,
                preferences_binding = this.getBinding('preferences');

            return _.div({ className: 'modules-component' },
                _.div({className: 'header-component'},
                    _.span({className: 'step-title'}, 'STEP 1: CHOOSE MODULE')
                ),
                _.div({className: 'main-component'}
                    , 'null'
                ),
                _.div({className: 'footer-component'},
                    _.div({className: 'stepbar-container'},
                        _.ul({className: 'stepbar'},
                            _.li({className: 'active'}, 'Choose Module'),
                            _.li({}, 'Set name'),
                            _.li({}, 'Configuration')
                        )
                    )
                )
            );
        }
    });
});
