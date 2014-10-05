define([
    // libs
    'morearty',
    // components
    // mixins
    '../../mixins/base_mixin',
    'mixins/data/data-layer',
    'mixins/sync/sync-layer'
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
        render: function () {
            var _ = React.DOM,
                preferences_binding = this.getDefaultBinding(),
                instance_binding = preferences_binding.sub('instance_temp'),
                moduleId = preferences_binding.val('moduleId'),
                module_binding = this.getModelFromCollection(moduleId, 'modules');

            return _.div({className: 'step-container'},
                _.div({ className: 'model-component' },
                    _.div({ className: 'form-data automation clearfix' },
                        _.div({key: 'form-group-title', className: 'form-group'},
                            _.label({className: 'input-label'}, 'title:'),
                            _.input({
                                key: 'title-input',
                                className: 'input-value',
                                type: 'text',
                                placeholder: 'Title',
                                value: instance_binding.val('title'),
                                onChange: Morearty.Callback.set(instance_binding, 'title')
                            })
                        ),
                        _.div({key: 'form-group-description', className: 'form-group'},
                            _.label({className: 'input-label'}, 'description:'),
                            _.textarea({
                                key: 'description-input',
                                className: 'input-value textarea-type',
                                placeholder: 'Description',
                                value: instance_binding.val('description'),
                                onChange: Morearty.Callback.set(instance_binding, 'description')
                            })
                        ),
                        _.div({key: 'form-group-moduleId', className: 'form-group inline'},
                            _.span({className: 'label-span'}, 'moduleId:'),
                            _.span({key: 'moduleId-info', className: 'span-value link'}, moduleId)
                        ),
                        _.div({
                                key: 'next-button',
                                className: 'modern-button green-mode center',
                                onClick: this.onNextHandler
                            }, 'NEXT'
                        )
                    )
                )
            );
        },
        onNextHandler: function () {
            var preferences_binding = this.getDefaultBinding();

            preferences_binding.set('step', 3);
            return false;
        }
    });
});
