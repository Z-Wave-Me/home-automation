define([
    // libs
    '../../../../../../bower_components/react/react-with-addons',
    'morearty',
    // components
    './_profile'
], function (
    // libs
    React,
    Morearty,
    // components
    _profile
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var binding = this.getDefaultBinding(),
                preferencesBinding = this.getBinding('preferences'),
                dataBinding = this.getBinding('data'),
                _ = React.DOM;

            return _.div({ className: 'main-component clearfix' },
                _profile({binding: { default: binding, data: dataBinding, preferences: preferencesBinding }})
            );
        }
    });
});
