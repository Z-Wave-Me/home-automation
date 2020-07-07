function modulePostRender() {
	$.ajax("/ZAutomation/api/v1/profiles")
		.done(function(profilesResponse) {
			if (profilesResponse.data && profilesResponse.data.length) {
				var list = $("<ul></ul>");
				var content = [];
				profilesResponse.data.forEach(function(p) {
					if (p.email) {
						content.push($("<li>" + p.email + " (" + p.name + ")</li>"));
					}
				});
				if (content.length) {
					content.forEach(function(row) { list.append(row); });
					$("#alpaca_data legend").first().append(list);
				}
			}
		});
};
