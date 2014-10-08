define([
    // libs
    'morearty',
    // components
    './common/_base_search',
    './modules_components/step1',
    './modules_components/step2',
    './modules_components/step3',
    // mixins
    '../mixins/base_mixin',
    'mixins/data/data-layer',
    'mixins/sync/sync-layer'
], function (
    // libs
    Morearty,
    // components
    _base_search,
    step1,
    step2,
    step3,
    // mixins
    base_mixin,
    data_layer
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin, data_layer],
        getInitialState: function () {
            return {
                steps: {
                    1: {
                        description: 'STEP 1: CHOOSE MODULE',
                        component: step1
                    },
                    2: {
                        description: 'STEP 2: SET NAME',
                        component: step2
                    },
                    3: {
                        description: 'STEP 3: CONFIGURATION',
                        component: step3
                    }
                }
            }
        },
        componentWillMount: function () {
            var that = this,
                preferences_binding = this.getBinding('preferences');

            preferences_binding.atomically()
                .set('step', 1)
                .set('moduleId', null)
                .set('instance_temp', null)
                .set('expanded', Immutable.Vector())
                .commit();

            this.module_listener = this.getBinding('preferences').addListener('moduleId', function (moduleId) {
                if (moduleId) {
                    var module = that.getModelFromCollection(moduleId, 'modules');
                    preferences_binding.atomically()
                        .set('instance_temp', Immutable.fromJS({
                            id: null,
                            title: module.sub('defaults').val('title'),
                            description: module.sub('defaults').val('description'),
                            moduleId: module.val('id'),
                            active: true,
                            params: {}
                        }))
                        .commit()
                }
            });
        },
        componentWillUnmount: function () {
            if (this.module_listener) {
                this.getBinding('preferences').removeListener(this.module_listener);
            }

            this.getBinding('preferences').atomically()
                .delete('step')
                .delete('moduleId')
                .delete('instance_temp')
                .delete('expanded')
                .commit();
        },
        render: function () {
            var _ = React.DOM,
                cx = React.addons.classSet,
                preferences_binding = this.getBinding('preferences'),
                step_numeric = preferences_binding.val('step'),
                step = this.state.steps[step_numeric];

            return _.div({ className: 'modules-component' },
                _.div({className: 'header-component'},
                    _.span({className: 'step-title'}, step.description)
                ),
                _.div({className: 'main-component'},
                    step.component({
                        binding: {
                            default: preferences_binding,
                            data: this.getBinding('data')
                        }
                    })
                ),
                _.div({className: 'footer-component'},
                    _.div({className: 'stepbar-container'},
                        _.ul({className: 'stepbar'},
                            _.li({className: step_numeric >= 1 ? 'active' : null}, 'Choose Module'),
                            _.li({className: step_numeric >= 2 ? 'active' : null}, 'Set name'),
                            _.li({className: step_numeric === 3 ? 'active' : null}, 'Configuration')
                        )
                    )
                )
            );
        }
    });
});
