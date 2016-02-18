function modulePostRender() {

	var self = this,
		batteries = [],
		nodeMarkers = [];

	$('#alpaca_data .nonBatteryDevices').bind('DOMNodeInserted', 'select[name^=devices_]', function () {
      	
		if (batteries.length < 1) {
			batteries = $(this).find('option').filter(function() { return $(this).val() === $(this).text(); });
	      	batteries = batteries.map( function() { return $(this).val() });

	      	batteries = $.each(batteries, function(index, id) {
	      		
	      		var nodeMark = id.split('-');

	      		if (nodeMarkers.indexOf(nodeMark[0]) === -1){
	      			nodeMarkers.push(nodeMark[0]);
	      		}
	      	});
		}

		$(this).find('option').each(function(index, el) {
			var nodeMark = $(el).val().split('-');
			
			if(nodeMarkers.indexOf(nodeMark[0]) > -1) {
				$(el).hide();
			}
		});
	});

	

	$('#alpaca_data .batteryDevices').bind('DOMNodeInserted', 'select[name^=devicesWithBattery_]', function () {
      	
		if (batteries.length < 1) {
			batteries = $(this).find('option').filter(function() { return $(this).val() === $(this).text(); });
	      	batteries = batteries.map( function() { return $(this).val() });

	      	batteries = $.each(batteries, function(index, id) {
	      		
	      		var nodeMark = id.split('-');

	      		if (nodeMarkers.indexOf(nodeMark[0]) === -1){
	      			nodeMarkers.push(nodeMark[0]);
	      		}
	      	});
		}

		$(this).find('option').each(function(index, el) {
			var nodeMark = $(el).val().split('-');
			
			if(nodeMarkers.indexOf(nodeMark[0]) === -1 || $(el).val() === $(el).text()) {
				$(el).hide();
			}
		});
	});
};