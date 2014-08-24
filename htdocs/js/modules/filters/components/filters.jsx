define([
    'backbone',
    'react',
    'react.backbone'
], function(Backbone, React) {

    var FiltersBlockView,
        AppModule = Mem.get('AppModule'),
        DevicesCollection = Mem.get('ServerSyncModule').getCollection('Devices'),
        LocationsCollection =  Mem.get('ServerSyncModule').getCollection('Locations'),
        StateModel = Mem.get('AppModule').getState();

    FiltersBlockView = React.createBackboneClass({
        mixins: [
            React.BackboneMixin("state", "change"),
            React.BackboneMixin("locations", "change add remove"),
            React.BackboneMixin("devices", "change add remove")
        ],

        handlePrimaryClick: function (filter) {
            var that = this;
            AppModule.setActiveFilter(filter.id);
        },

        render: function() {
            var that = this,
                items = ['all'];

            return (
                <div className="container-filters">
                    <nav className="subNavigation clearfix">
                        {that.props.state.get('filters').map(function(filter) {
                            return (
                                <a
                                    key={filter.id}
                                    onClick={that.handlePrimaryClick.bind(that, filter)}
                                    className={filter.id === that.props.state.get('primaryFilter') ? 'active' : ''}>
                                    {filter.title.toUpperCase()}
                                </a>
                            );
                        })}
                    </nav>
                    <nav className="subNavigation mFilterItem clearfix">
                        {function () {
                            if (that.props.state.get('primaryFilter') === 'types') {
                                items = _.union(items, DevicesCollection.pluck('deviceType'));
                            } else if (that.props.state.get('primaryFilter') === 'tags') {
                                items = _.union(items, _.flatten(DevicesCollection.pluck('tags')));
                            } else if (that.props.state.get('primaryFilter') === 'rooms') {
                                items = _.union(items, LocationsCollection.pluck('name'));
                            }

                            {items.map(function (item) {
                                return (
                                    <a
                                        key={item}
                                        onClick={that.handlePrimaryClick.bind(that, item)}
                                        className={item === that.props.state.get('valueFilter') ? 'active' : ''}>
                                        {item.toUpperCase()}
                                    </a>
                                );
                            })}
                        }.bind(this)()}
                    </nav>
                </div>
            );
        }
    });

    /**
     * <FiltersBlock />
     */

    return FiltersBlockView({state: StateModel, locations: LocationsCollection, devices: DevicesCollection});
});