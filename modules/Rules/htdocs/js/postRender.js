function modulePostRender(control) {
    if($('input[name=advanced_activate]').is(':checked')) {
        $('div[data-alpaca-container-item-name=triggerEvent]').hide();
        $('div[data-alpaca-container-item-name=targets]').hide();
        $('div[data-alpaca-container-item-name=delay]').hide();
        /* Function to setup mail notification for advanced */
    }

    /* Ausblenden der Standardkonfiguration */
    $(document).on("click", "input[name=advanced_activate]", function() {
        if($('input[name=advanced_activate]').is(':checked')) {
            $('div[data-alpaca-container-item-name=triggerEvent]').hide();
            $('div[data-alpaca-container-item-name=targets]').hide();
            $('div[data-alpaca-container-item-name=delay]').hide();
            /* Function to setup mail notification for advanced */
        } else {
            $('div[data-alpaca-container-item-name=triggerEvent]').show();
            $('div[data-alpaca-container-item-name=targets]').show();
            $('div[data-alpaca-container-item-name=delay]').show();
            /* Function to setup mail notification */
        }
    });
}