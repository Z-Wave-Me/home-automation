define([
    // libs
    'morearty',
    // components
    './common/_base_search',
    './common/_buttons_group',
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
    _buttons_group,
    // mixins
    base_mixin,
    data_layer_mixin,
    sync_layer_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin, data_layer_mixin, sync_layer_mixin],
        getInitialState: function () {
            return {
                loading: false,
                form: null
            };
        },
        componentWillMount: function () {
            var preferences_binding = this.getBinding('preferences');
            preferences_binding.atomically()
                .set('show_turned_off', true)
                .set('search_string_on_instance_page', '')
                .set('hover_instance_id', null)
                .set('select_instance_id', null)
                .commit();
        },
        preventDefault: function (e) {
            e.preventDefault();
        },
        componentWillUnmount: function () {
            var preferences_binding = this.getBinding('preferences');
            preferences_binding.delete('show_turned_off');
            preferences_binding.delete('search_string_on_instance_page');
            preferences_binding.delete('hover_instance_id');
            preferences_binding.delete('select_instance_id');
        },
        render: function () {
            var _ = React.DOM,
                data_binding = this.getBinding('data'),
                instances_binding = data_binding.sub('instances'),
                preferences_binding = this.getBinding('preferences');

            return _.div({ className: 'automation-component' },
                _.div({className: 'header-component'},
                    _.div({className: 'pull-left'},
                        _.div({ key: 'form-default-profile-input', className: 'form-group' },
                            _.label({className: 'switch-container'},
                                _.input({
                                        className: 'ios-switch',
                                        type: 'checkbox',
                                        checked: preferences_binding.val('show_turned_off'),
                                        onChange: this.onShowTurnedOffHandler
                                    },
                                    _.div({},
                                        _.div({className: 'bubble-switch'})
                                    )
                                ),
                                'Show turned off'
                            )
                        )
                    ),
                    _.div({className: 'pull-right'},
                        _base_search({
                            binding: {
                                default: preferences_binding
                            },
                            'search_attr': preferences_binding.sub('search_string_on_instance_page')
                        })
                    )
                ),
                _.ul({className: 'instances-list'},
                    instances_binding.val().map(this.getInstance).toArray()
                )
            );
        },
        getInstance: function (item, index) {
            var _ = React.DOM,
                cx = React.addons.classSet,
                data_binding = this.getBinding('data'),
                preferences_binding = this.getBinding('preferences'),
                item_binding = data_binding.sub('instances').sub(index),
                moduleId = item_binding.val('moduleId'),
                module_binding = this.getModelFromCollection(moduleId, 'modules'),
                id = item_binding.val('id'),
                icon = item_binding.val('icon') || null,
                params_binding = item_binding.sub('params'),
                hovered = preferences_binding.val('hover_instance_id') === id,
                selected = preferences_binding.val('select_instance_id') === id,
                status_classes = cx({
                    'instance-status': true,
                    enable: params_binding.val('status') === 'enable',
                    disable: params_binding.val('status') === 'disable'
                }),
                state_class = cx({
                    'instance-item': true,
                    selected: selected,
                    hovered: hovered
                });

            return this.isShown(item_binding) ? _.li({
                    key: id,
                    className: state_class,
                    onMouseEnter: this.onToggleHoverItemList.bind(null, id),
                    onMouseLeave: this.onToggleHoverItemList.bind(null, null)
                },
                _.div({className: 'header-item', onClick: this.onToggleSelectItemList.bind(null, id)},
                    _.span({className: status_classes}),
                    _.span({className: 'instance-icon'}, icon),
                    _.span({className: 'instance-title'}, params_binding.val('title')),
                    _.span({className: 'module-title'}, '(' + module_binding.sub('defaults').val('title') + ')'),
                    hovered || selected ? _.span({
                            className: 'instance-status-checkbox',
                            onClick: this.onStatusModuleHandler.bind(null, item_binding)
                        },
                        _.label({className: 'switch-container'},
                            _.input({
                                    className: 'ios-switch green',
                                    type: 'checkbox',
                                    checked: params_binding.val('status') === 'enable',
                                    readOnly: true
                                },
                                _.div({},
                                    _.div({className: 'bubble-switch'})
                                )
                            )
                        )
                    ) : null
                ),
                // left panel
                selected ? _.div({className: 'left-panel-instance panel-instances'},
                    _.div({key: 'form-group-title', className: 'form-group'},
                        _.label({className: 'input-label'}, 'title:'),
                        _.input({
                            key: 'title-input',
                            className: 'input-value',
                            type: 'text',
                            placeholder: 'Title',
                            value: params_binding.val('title'),
                            onChange: Morearty.Callback.set(params_binding, 'title')
                        })
                    ),
                    _.div({key: 'form-group-description', className: 'form-group'},
                        _.label({className: 'input-label'}, 'description:'),
                        _.textarea({
                            key: 'description-input',
                            className: 'input-value textarea-type',
                            placeholder: 'Description',
                            value: params_binding.val('description'),
                            onChange: Morearty.Callback.set(params_binding, 'description')
                        })
                    ),
                    _.div({key: 'form-group-moduleId', className: 'form-group inline'},
                        _.span({className: 'label-span'}, 'moduleId:'),
                        _.span({key: 'moduleId-info', className: 'span-value link'}, moduleId)
                    ),
                    _.div({
                            key: 'save-button',
                            className: 'modern-button green-mode center',
                            onClick: this.onSaveInstanceHandler.bind(null, item_binding)
                        }, 'Save', this.state.loading ? _.div({ className: 'spinner' }) : null
                    )
                ) : null,
                // right panel
                selected ? _.div({className: 'right-panel-instance panel-instances'},
                    _.div({className: 'alpaca-main', ref: 'alpacaNodeRef'})
                ) : null
            ) : null;
        },
        onToggleHoverItemList: function (id) {
            this.getBinding('preferences').sub('hover_instance_id').set(id);
        },
        onToggleSelectItemList: function (id) {
            var selected = this.getBinding('preferences').val('select_instance_id') === id;
            if (!selected) {
                this.getBinding('preferences').sub('select_instance_id').set(id);
                this.forceUpdate(function () {
                    this.renderAlpaca(id);
                });
            }
        },
        renderAlpaca: function (instanceId) {
            var that = this, instanceJson, module, moduleJson, params, $el,
                instance = that.getModelFromCollection(instanceId, 'instances')

            if (!instance || !instanceId) {
                return;
            }

            instanceJson = instance.val().toJS();
            module = that.getModelFromCollection(instanceJson.moduleId, 'modules');
            moduleJson = module.val().toJS();
            params = Sticky.get('App.Helpers.JS').extend(instanceJson.params, {
                title: instanceJson.params.title || moduleJson.defaults.title,
                description: instanceJson.params.description || moduleJson.defaults.description
            });
            $el = $(that.refs.alpacaNodeRef.getDOMNode());

            $el.empty().alpaca({
                data: that.updateObjectAsNamespace(Sticky.get('App.Helpers.JS').omit(params, 'title', 'description')),
                schema: that.updateObjectAsNamespace(moduleJson.schema),
                options: that.updateObjectAsNamespace(moduleJson.options),
                postRender: function (form) {
                    that.setState({form: form});
                }
            });
        },
        onShowTurnedOffHandler: function (event) {
            this.getBinding('preferences').set('show_turned_off', event.target.checked);
            return false;
        },
        onStatusModuleHandler: function (instance, event) {
            this.preventDefault(event);

            instance.sub('params').update('status', function (status) {
                return status === 'disable' ? 'enable' : 'disable';
            });

            this.save({
                model: instance,
                serviceId: 'instances'
            });

            this.forceUpdate();

            return false;
        },
        onSaveInstanceHandler: function (item_binding) {
            var that = this;
            that.setState({'loading': true});

            if (this.state.form !== null) {
                item_binding.sub('params').merge(that.state.form.getValue());
                that.save({
                    model: item_binding,
                    serviceId: 'instances',
                    success: function () {
                        //that.setState({'loading': false});
                    }
                });
            }

        },
        isShown: function (instance) {
            var params_binding = instance.sub('params'),
                module_id = instance.val('moduleId'),
                search_string = this.getBinding('preferences').val('search_string_on_instance_page'),
                module = this.getModelFromCollection(module_id, 'modules'),
                show_turned_off = this.getBinding('preferences').val('show_turned_off');

            if (search_string.length > 1) {
                return (params_binding.val('title').toLowerCase().indexOf(search_string) !== -1 ||
                    module.sub('defaults').val('title').toLowerCase().indexOf(search_string) !== -1);
            } else {
                if (show_turned_off || (!show_turned_off && params_binding.val('status') === 'enable')) {
                    return true;
                }
            }
        }
    });
});
