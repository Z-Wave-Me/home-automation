define([
    // libs
    'react',
    'morearty',
    // components
    '../common/_buttons_group'
], function (
    // libs
    React,
    Morearty,
    _buttons_group
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var that = this,
                binding = this.getDefaultBinding(),
                preferencesBinding = this.getBinding('preferences'),
                dataBinding = this.getBinding('data'),
                _ = React.DOM;

            return _.div({ className: 'form-data profile adding-status' },
                _.legend({ className: 'legend'}, 'Create profile'),
                _.div({ className: 'form-group' },
                    _.label({ htmlFor: 'profile-name', className: 'input-label'}, 'Name'),
                    _.input({ id: 'profile-name', className: 'input-value', type: 'text', placeholder: 'Name'})
                ),
                _.div({ className: 'form-group' },
                    _.label({ htmlFor: 'profile-description', className: 'input-label'}, 'Description'),
                    _.textarea({ id: 'profile-description',className: 'input-value textarea-type', col: 3, row: 3, placeholder: 'Description'})
                ),
                _.div({ className: 'form-group' },
                    _.div({className: 'checkbox-group'},
                        _.input({id: 'makeAsDefault', className: 'checkbox-type', type: 'checkbox', name: 'makeAsDefault'}),
                        _.label({htmlFor: 'makeAsDefault', className: 'input-label'}, 'Make as default profile')
                    )
                ),
                _buttons_group({binding: preferencesBinding})
            );
        }
    });
});
