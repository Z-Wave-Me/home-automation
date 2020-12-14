function modulePostRender() {
	if ($("div[data-alpaca-field-name='pin']").find('input').val() === "") {
		$("div[data-alpaca-field-name='pin']").hide();	
	}	
	else {
		$("div[data-alpaca-field-name='pin']").show();		
	}
};