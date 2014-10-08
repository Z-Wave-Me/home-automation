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
                data_binding = this.getBinding('data'),
                modules_categories_binding = data_binding.sub('modules_categories');

            return _.div({ className: 'step-container' },
                _.ul({className: 'category-modules-list'},
                    modules_categories_binding.val().map(this.getCategory).toArray()
                )
            );
        },
        getCategory: function (category) {
            var that = this,
                _ = React.DOM,
                cx = React.addons.classSet,
                data_binding = this.getBinding('data'),
                modules_binding = data_binding.sub('modules'),
                filtered_modules = modules_binding.val().filter(function (module) {
                    return module.get('category') === category.get('id')
                }),
                filtered_modules_length = filtered_modules.toArray().length,
                number_step = 3,
                count_step = Math.ceil(filtered_modules_length / number_step),
                portions =  Array.apply(null, {length: count_step}).map(Number.call, Number).map(function(step) {
                    var begin = step * number_step;
                    return filtered_modules.slice(begin, begin + number_step);
                }),
                is_expanded = this._isExpandedCategory(category.get('id')),
                category_classes = cx({
                    expanded: is_expanded,
                    collapsed: !is_expanded,
                    'category-module-item': true
                }),
                search_string = this.getDefaultBinding().val('search_string_on_modules_list');

            return _.li({key: 'category-' + category.get('id'), className: category_classes},
                search_string.length < 3 ? _.div({
                        className: 'category-header',
                        onClick: this.onToggleExpanded.bind(null, category.get('id'))
                    },
                    _.div({className: 'category-name'},
                        category.get('name')
                    ),
                    _.div({className: 'category-description'},
                        ' - ' + category.get('description')
                    ),
                    _.div({className: 'count-modules'},
                            filtered_modules_length === 1 ? '1 module' : filtered_modules_length + ' modules')
                ) : null,
                is_expanded || search_string.length > 2 ? _.div({className: 'modules-list'},
                    portions.map(function (portion, index) {
                        return _.div({key: 'portion-' + portions.length + '-' + index, className: 'row'},
                            portion.map(that.getModule).toArray()
                        )
                    })
                ) : null
            )
        },
        getModule: function (module) {
            var _ = React.DOM,
                defaults = module.get('defaults'),
                id = module.get('id'),
                title = defaults.get('title'),
                description = defaults.get('description'),
                author = module.get('author'),
                homepage_url = module.get('homepage'),
                version = module.get('version'),
                maturity = module.get('maturity'),
                is_used = this.isUsedSingletonModule(id),
                search_string = this.getDefaultBinding().val('search_string_on_modules_list'),
                is_match = search_string.length < 3 ? true :
                    title.toLowerCase().indexOf(search_string.toLowerCase()) !== -1 ||
                        id.toLowerCase().indexOf(search_string.toLowerCase()) !== -1;

            return is_match ? _.div({key: 'module-' + id, className: 'col-1-3 module-container'},
                _.span({key: 'data-group-id', className: 'data-group'},
                    _.span({key: 'label-item-id', className: 'label-item'}, 'id: '),
                    _.span({key: 'value-item-id', className: 'value-item'}, id)
                ),
                _.span({key: 'data-group-title', className: 'data-group'},
                    _.span({key: 'label-item-title', className: 'label-item'}, 'title: '),
                    _.span({key: 'value-item-title', className: 'value-item'}, title)
                ),
                _.span({key: 'data-group-author', className: 'data-group'},
                    _.span({key: 'label-item-author', className: 'label-item'}, 'author: '),
                    _.span({key: 'value-item-author', className: 'value-item'}, author)
                ),
                _.span({key: 'data-group-homepage', className: 'data-group'},
                    _.span({key: 'label-item-homepage', className: 'label-item'}, 'homepage: '),
                    _.span({key: 'value-item-homepage', className: 'value-item'},
                        _.a({
                            className: 'link',
                            href: homepage_url,
                            title: homepage_url
                        }, '>>')
                    )
                ),
                _.span({key: 'data-group-version', className: 'data-group'},
                    _.span({key: 'label-item-version', className: 'label-item'}, 'version: '),
                    _.span({key: 'value-item-version', className: 'value-item'}, version)
                ),
                _.span({key: 'data-group-maturity', className: 'data-group'},
                    _.span({key: 'label-item-maturity', className: 'label-item'}, 'maturity: '),
                    _.span({key: 'value-item-maturity', className: 'value-item'}, maturity)
                ),
                _.span({key: 'data-group-description', className: 'data-group no-inline'},
                    _.span({key: 'label-item-description', className: 'label-item'}, 'description: '),
                    _.span({key: 'value-item-description', className: 'value-item'}, description)
                ),
                _.div({className: 'buttons-container'},
                    is_used ?
                        _.span({className: 'is-used'}, 'USED') :
                        _.button({
                            className: 'green-mode modern-button',
                            onClick: this.onSelectModuleHandler.bind(null, id)
                        }, 'SELECT')
                )
            ) : null;
        },
        onSelectModuleHandler: function (moduleId) {
            var preferences_binding = this.getDefaultBinding();
            preferences_binding.set('moduleId', moduleId);
            preferences_binding.set('step', 2);
        },
        onToggleExpanded: function (categoryId) {
            var preferences_binding = this.getDefaultBinding(),
                expanded = preferences_binding.sub('expanded'),
                is_expanded = this._isExpandedCategory(categoryId);

            if (!is_expanded) {
                expanded.update(function (categories) {
                    return categories.push(categoryId);
                });
            } else {
                expanded.update(function (categories) {
                    return categories.filter(function (id) {
                        return id !== categoryId;
                    }).toVector();
                });
            }

            return false;
        },
        _isExpandedCategory: function (categoryId) {
            var preferences_binding = this.getDefaultBinding(),
                expanded = preferences_binding.sub('expanded');

            return expanded.val().indexOf(categoryId) !== -1;
        }
    });
});
