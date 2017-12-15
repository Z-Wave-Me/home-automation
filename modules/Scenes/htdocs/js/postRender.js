function modulePostRender() {
	var icons;
	$(document).ready(function() {

		$('.alpaca-fileupload-well').hide();

		$.ajax('/ZAutomation/api/v1/icons')
			.done(function(iconsResponse) {
				var moduleId = parseInt(window.location.href.substring(window.location.href.lastIndexOf("/") + 1));
				if (!isNaN(moduleId)) {
					$.ajax('/ZAutomation/api/v1/instances/' + moduleId)
						.done(function(response) {
							if (typeof iconsResponse.data != 'undefined')
							{
								icons = iconsResponse.data;
								$("select[name='icon-select']").each(function(i,select) {
									$(iconsResponse.data).each(function(n, row){
										var id = $(select).attr('name').split('_')[2];
										if ($(select).attr('name').indexOf('customicon') != -1)
											selected = row.file == response.data.params.customicon.table[id].icon;

										var option = $('<option>', {
	    									value: row.file,
	    									text: row.orgfile,
	    									selected: selected
										});

										$(select).append(option);

										if (selected) {
											$(select).parent().parent().next('td').find('img').attr('src','user/icons/' + row.file);
										}
									});
								});
							}
						});
				} else {
					if (typeof iconsResponse.data != 'undefined')
					{
						$("select[name='icon-select']").each(function(i,select) {
							if ($(select).attr('name').indexOf('scene') != -1)
								return;
							icons = iconsResponse.data;
							$(iconsResponse.data).each(function(n, row){
								var option = $('<option>', {
					    			value: row.file,
					    			text: row.orgfile,
								});
								$(select).append(option);
							});
						});
					}					
				}
			})
			.fail(function() {
				console.log('unable to load custom icons');
			});

		$(document).on('click', 'select[name="icon-select"]', function() {
			$(this).parent().parent().next('td').find('img').attr('src','user/icons/' + $(this).val());
		});

		$(document).ajaxComplete(function( event, xhr, settings ) {
			if (settings.url === '/ZAutomation/api/v1/icons/upload'){
				$.ajax('/ZAutomation/api/v1/icons')
					.done(function(iconsResponse) {
						var moduleId = parseInt(window.location.href.substring(window.location.href.lastIndexOf("/") + 1));
						if (!isNaN(moduleId)) {
							$.ajax('/ZAutomation/api/v1/instances/' + moduleId)
								.done(function(response) {
									if (typeof iconsResponse.data != 'undefined')
									{
										icons = iconsResponse.data;
										$("select[name='icon-select']").each(function(i,select) {
											$(select).empty();
											$(select).append($('<option>', {
									    		value: '',
									    		text: 'None',
											}));											
											$(iconsResponse.data).each(function(n, row){
												var id = $(select).attr('name').split('_')[2];
												if ($(select).attr('name').indexOf('customicon') != -1)
													selected = row.file == response.data.params.customicon.table[id].icon;

												var option = $('<option>', {
			    									value: row.file,
			    									text: row.orgfile,
			    									selected: selected
												});

												$(select).append(option);

												if (selected) {
													$(select).parent().parent().next('td').find('img').attr('src','user/icons/' + row.file);
												}
											});
										});
									}
								});
						} else {
							if (typeof iconsResponse.data != 'undefined')
							{
								$("select[name='icon-select']").each(function(i,select) {
									$(select).empty();
									icons = iconsResponse.data;
									$(select).append($('<option>', {
							    		value: '',
							    		text: 'None',
									}));
									$(iconsResponse.data).each(function(n, row){
										var option = $('<option>', {
							    			value: row.file,
							    			text: row.orgfile,
										});
										$(select).append(option);
									});
								});
							}					
						}
					})
					.fail(function() {
						console.log('unable to load custom icons');
					});				
			}
		});		
	});
};