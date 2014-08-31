define([
    // libs
    'react',
    'morearty',
    // components
    'Widgets'
], function (
    // libs
    React,
    Morearty,
    // components
    Widgets
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin],
        render: function () {
            var binding = this.getDefaultBinding(),
                _ = React.DOM;

            return _.div({ className: 'main-container clearfix' },
                _.div({id: 'main-region', className: 'main wrapper clearfix'},
                    Widgets({binding: binding})
                )
            );
        }
    });
});
