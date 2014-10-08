define([
    // libs
'morearty',
    // components
    'Widgets'
], function (
    // libs
    Morearty,
    // components
    Widgets
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var binding = this.getDefaultBinding(),
                dataBinding = this.getBinding('data'),
                _ = React.DOM;

            return _.div({ className: 'main-container clearfix' },
                _.div({id: 'main-region', className: 'main wrapper clearfix'},
                    Widgets({binding: { default: binding, data: dataBinding, preferences: this.getBinding('preferences')}})
                )
            );
        }
    });
});
