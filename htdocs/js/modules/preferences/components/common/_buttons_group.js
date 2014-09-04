define([
    // libs
    'react',
    'morearty',
    // mixins
    './../../mixins/base_mixin'
], function (
    // libs
    React,
    Morearty,
    // mixins
    base_mixin
    ) {
    'use strict';

    return React.createClass({
        mixins: [Morearty.Mixin, base_mixin],
        getButtons: function () {
            var _ = React.DOM,
                binding = this.getDefaultBinding(),
                saveButton = _.button({
                    className: 'save-button button action',
                    onClick: this.setActiveNodeTreeStatus.bind(null, 'normal')},
                    'Save'),
                editButton = _.button({
                    className: 'edit-button button action',
                    onClick: this.setActiveNodeTreeStatus.bind(null, 'editing')},
                    'Edit'),
                cancelButton = _.button({
                    className: 'cancel-button button action',
                    onClick: this.setActiveNodeTreeStatus.bind(null, 'normal')},
                    'Cancel');

            if (binding.val('activeNodeTreeStatus') === 'editing' || binding.val('activeNodeTreeStatus') === 'adding') {
                return [saveButton, cancelButton];
            } else {
                return editButton;
            }
        },
        render: function () {
            var _ = React.DOM;

            return _.div({ className: 'buttons-group'},
                this.getButtons()
            );
        }
    });
});
