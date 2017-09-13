function modulePostRender(control) {
	var scheduler = control.childrenByPropertyId['scheduler'];
	var api = control.data.api;
	if(scheduler.getValue() == 0) {
		addButton();
	}

	scheduler.on('change', function() {
		if(this.getValue() == 0) {
			addButton();
		} else {
			removeButton();
		}
	});

	function addButton() {
		var $button = $('<a>');
		var $i = $('<i>');
		$button.addClass('btn btn-default btn-sm');
		$i.addClass('fa fa-cloud-upload');
		$button.append($i);
		$button.attr('href', "http://"+location.host+api);
		$button.append('Upload Backup');

		$button.on('click', function(event) {
			event.preventDefault();
			var $this = $(this);
			var url = $this.attr('href');
			$.get(url);
		});

		$('.cloudBackupScheduler').append($button);
	}

	function removeButton() {
		$('.cloudBackupScheduler').find('a').remove();
	}
}