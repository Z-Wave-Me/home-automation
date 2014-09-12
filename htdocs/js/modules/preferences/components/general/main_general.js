define([
    // libs
    'react',
    'morearty',
    // components
    './_add_profile',
    './_normal_profile'
], function (
    // libs
    React,
    Morearty,
    // components
    _add_profile,
    _normal_profile
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var binding = this.getDefaultBinding(),
                preferencesBinding = this.getBinding('preferences'),
                dataBinding = this.getBinding('data'),
                _ = React.DOM,
                getComponent;

            getComponent = function () {
                if (binding.val('activeNodeTreeStatus') === 'adding' || binding.val('activeNodeTreeStatus') === 'editing') {
                    return _add_profile({binding: { default: binding, data: dataBinding, preferences: preferencesBinding }})
                } else {
                    return _normal_profile({binding: { default: binding, data: dataBinding, preferences: preferencesBinding }})
                }
            };

            return _.div({ className: 'main-component clearfix' },
                getComponent()
            );
        }
    });
});
