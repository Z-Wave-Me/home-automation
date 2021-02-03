function modulePostRender(control) {
	// advanced code editor is available only on Chome
	if (!window.chrome) {
		$(".alpaca-field.alpaca-field-textarea textarea").parent().prepend($('<div></div>').text('__h_unsupported__'));
		return;
	}

	// detect cursor position on screen
	// https://openbase.io/js/textarea-caret
	function getCaretCoordinates(element, position, options) {
		// We'll copy the properties below into the mirror div.
		// Note that some browsers, such as Firefox, do not concatenate properties
		// into their shorthand (e.g. padding-top, padding-bottom etc. -> padding),
		// so we have to list every single property explicitly.
		var properties = [
			'direction',  // RTL support
			'boxSizing',
			'width',  // on Chrome and IE, exclude the scrollbar, so the mirror div wraps exactly as the textarea does
			'height',
			'overflowX',
			'overflowY',  // copy the scrollbar for IE

			'borderTopWidth',
			'borderRightWidth',
			'borderBottomWidth',
			'borderLeftWidth',
			'borderStyle',

			'paddingTop',
			'paddingRight',
			'paddingBottom',
			'paddingLeft',

			// https://developer.mozilla.org/en-US/docs/Web/CSS/font
			'fontStyle',
			'fontVariant',
			'fontWeight',
			'fontStretch',
			'fontSize',
			'fontSizeAdjust',
			'lineHeight',
			'fontFamily',

			'textAlign',
			'textTransform',
			'textIndent',
			'textDecoration',  // might not make a difference, but better be safe

			'letterSpacing',
			'wordSpacing',

			'tabSize',
			'MozTabSize'
		];

		var isFirefox = window.mozInnerScreenX != null;
		
		// The mirror div will replicate the textarea's style
		var div = document.createElement('div');
		div.id = 'input-textarea-caret-position-mirror-div';
		document.body.appendChild(div);

		var style = div.style;
		var computed = window.getComputedStyle ? window.getComputedStyle(element) : element.currentStyle;  // currentStyle for IE < 9

		// Default textarea styles
		style.whiteSpace = 'pre-wrap';
		style.wordWrap = 'break-word';  // only for textarea-s

		// Position off-screen
		style.position = 'absolute';  // required to return coordinates properly
		style.visibility = 'hidden';  // not 'display: none' because we want rendering

		// Transfer the element's properties to the div
		properties.forEach(function (prop) {
			style[prop] = computed[prop];
		});

		if (isFirefox) {
		// Firefox lies about the overflow property for textareas: https://bugzilla.mozilla.org/show_bug.cgi?id=984275
		if (element.scrollHeight > parseInt(computed.height))
			style.overflowY = 'scroll';
		} else {
			style.overflow = 'hidden';  // for Chrome to not render a scrollbar; IE keeps overflowY = 'scroll'
		}

		div.textContent = element.value.substring(0, position);
		// The second special handling for input type="text" vs textarea:
		// spaces need to be replaced with non-breaking spaces - http://stackoverflow.com/a/13402035/1269037
		

		var span = document.createElement('span');
		// Wrapping must be replicated *exactly*, including when a long word gets
		// onto the next line, with whitespace at the end of the line before (#7).
		// The *only* reliable way to do that is to copy the *entire* rest of the
		// textarea's content into the <span> created at the caret position.
		// For inputs, just '.' would be enough, but no need to bother.
		span.textContent = element.value.substring(position) || '.';  // || because a completely empty faux span doesn't render at all
		div.appendChild(span);

		var coordinates = {
			top: span.offsetTop + parseInt(computed['borderTopWidth']),
			left: span.offsetLeft + parseInt(computed['borderLeftWidth']),
			height: parseInt(computed['lineHeight'])
		};

		document.body.removeChild(div);

		return coordinates;
	}

	// syntax highlight
	$(".alpaca-field.alpaca-field-textarea textarea").addClass('editor allow-tabs').wrap(
		$('<div></div>').addClass('scroller')
	).parent().append(
		$('<pre></pre>').append(
			$('<code></code>').addClass('syntax-highight javascript')
		)
	).wrap(
		$('<div></div>').addClass('highlight-editor-holder')
	).parent().prepend(
		$('<ul></ul>').addClass('toolbar')
	);

	// menu handling
	function modalBackground(id) {
		var suffix = '-modal';
		$('#' + id + suffix).remove();
		return $('<div></div>')
			.attr('id', id + suffix)
			.attr('role', 'menu-modal')
			.addClass('dropdown-menu-modal')
			.click(function(event) {
				$(this).css({
					'display': 'none'
				});
				var id = $(this).attr('id');
				id = id.substr(0, id.length - suffix.length);
				$('#' + id).css({
					'display': 'none'
				});
			});
	}
	
	function modalMenu(id) {
		$('#' + id).remove();
		return $('<ul></ul>')
			.attr('id', id)
			.attr('role', 'menu')
			.addClass('dropdown-menu');
	}
	
	function menu(id) {
			$('body')
			.append(modalBackground(id + '-menu'))
			.append(modalMenu(id + '-menu'));
	}

	function menuOpen(menu_id, pos) {
		$('#' + menu_id + '-menu').css({
			position: "fixed",
			display: "block",
			left: pos.left + 'px',
			top: pos.top + 'px'
		});
		$('#' + menu_id + '-menu-modal').css({
			'display': 'block'
		});
	}
	
	function menuAttach(el, menu_id, openon) {
		return el
			.attr('id', menu_id)
			.attr('context', menu_id + '-menu')
			.attr('openon', openon)
			.bind(openon, function(event) {
				event.preventDefault();
				var pos = this.getBoundingClientRect();
				menuOpen(menu_id, {
					left: openon === 'mouseover' ? pos.right : event.clientX,
					top: openon === 'mouseover' ? pos.top : event.clientY
				});
			});
	}

	function menuItemAdd(menu_id, item_id, text, action) {
			$('#' + menu_id + '-menu').append(
				$('<li></li>')
					.append(
						$('<a></a>')
							.text(text)
							.click(function() {
								menuClose(this);
								action(this);
							})
					)
					.attr('id', menu_id + '-menu-item-' + item_id)
			);
	}
	
	function menuClose(item) {
		var menuName = item + '-menu';
		if (typeof item !== "string") {
			menuName = $(item).closest('[role="menu"]').attr('id');
		}
		
		$('#' + menuName).css({
			'display': 'none'
		});
		$('#' + menuName + '-modal').css({
			'display': 'none'
		});
	}
	
	function menuItemAddText(menu_id, text, data, textarea) {
		$('#' + menu_id + '-menu').append(
			$('<li></li>')
				.append(
					$('<a></a>')
						.text(text)
						.click(function() {
								menuClose(this);
								textareaTextAt(data, textarea);
						})
				)
		);
	}
	
	function menuItemAddDelimiter(menu_id) {
		$('#' + menu_id + '-menu').append($('<li></li>').addClass('divider'));
	}
	
	function toolbarMenuAdd(menu_id, icon, name) {
		$('.highlight-editor-holder .toolbar').append(
				menuAttach(
					$('<li></li>')
						.append(
							$('<a></a>').append(
								$('<i> ' + name +'</i>').addClass('fas ' + icon)
							)
						),
					menu_id,
					'click'
				)
		);
		menu(menu_id);
	}
	
	// fill toolbar with menus
	
	toolbarMenuAdd('easy-scripting-devices-events', 'fa-play', '__m_events__');
	toolbarMenuAdd('easy-scripting-devices-objects', 'fa-lightbulb', '__m_devices__');
	toolbarMenuAdd('easy-scripting-syntax', 'fa-code', '__m_expressions__');

	// fill menu with devices
	$.ajax('/ZAutomation/api/v1/devices')
		.done(function (response) {
			response.data.devices.sort(function(a, b) {
				if (a.metrics.title === b.metrics.title) return (a.id < b.id) ? -1 : 1;
				return (a.metrics.title < b.metrics.title) ? -1 : 1;
				
			}).forEach(function(dev) {
				// events
				menuItemAdd("easy-scripting-devices-events", dev.id, dev.metrics.title + ' (' + dev.id + ')', function() {
					textareaTextAtTop('### ' + dev.id + ' // ' + dev.metrics.title + '\n');
				});
				menuItemAdd("easy-scripting-devices-objects", dev.id, dev.metrics.title + ' (' + dev.id + ')', function() {
					textareaTextAt('vdev("' + dev.id + '")');
				});
			});
		})
		.fail(function () {
			alert('no devices');
		});

	// special characters
	var exprBool = '\u229c',
	    exprVal = '\u2299',
	    expression = '\u2026',
	    placeHolders = [exprBool, exprVal, expression];
	
	var textArea = $(".alpaca-field.alpaca-field-textarea textarea");
	
	menu('easy-scripting-syntax');
	menuItemAddText('easy-scripting-syntax', '__m_if__', 'if (' + exprBool + ') {\n  ' + expression + '\n}');
	menuItemAddText('easy-scripting-syntax', '__m_for_loop__', 'for (var i = 0; i < ' + exprVal + '; i++) {\n  ' + expression + '\n}');
	menuItemAddText('easy-scripting-syntax', '__m_while_loop__', 'while (' + exprBool + ') {\n  ' + expression + '\n}');
	menuItemAddDelimiter('easy-scripting-syntax');
	menuItemAddText('easy-scripting-syntax', '__m_or__', '' + exprBool + ' || ' + exprBool + '');
	menuItemAddText('easy-scripting-syntax', '__m_and__', '' + exprBool + ' && ' + exprBool + '');
	menuItemAddDelimiter('easy-scripting-syntax');
	menuItemAddText('easy-scripting-syntax', '__m_http_request__', 'http.request({method: "GET", async: true, url: ' + exprVal + '});');
	menuItemAddText('easy-scripting-syntax', '__m_set_timeout__', 'setTimer("' + expression + '", function() {\n  ' + expression + '\n}, ' + exprVal + ')');
	menuItemAddText('easy-scripting-syntax', '__m_remove_timeout__', 'stopTimer("' + expression + '")');

	menu('easy-scripting-device-methods');
	menuItemAddText('easy-scripting-device-methods', '__m_turn_on__', 'on()');
	menuItemAddText('easy-scripting-device-methods', '__m_turn_off__', 'off()');
	menuItemAddText('easy-scripting-device-methods', '__m_turn_set__', 'set(' + exprVal + ')');
	menuItemAddText('easy-scripting-device-methods', '__m_update__', 'update()');
	menuItemAddDelimiter('easy-scripting-device-methods');
	menuItemAddText('easy-scripting-device-methods', '__m_is_on__', 'value() === "on"');
	menuItemAddText('easy-scripting-device-methods', '__m_is_off__', 'value() === "off"');
	menuItemAddText('easy-scripting-device-methods', '__m_equals__', 'value() === ' + exprVal);
	menuItemAddText('easy-scripting-device-methods', '__m_ne__', 'value() !== ' + exprVal);
	menuItemAddText('easy-scripting-device-methods', '__m_gt__', 'value() > ' + exprVal);
	menuItemAddText('easy-scripting-device-methods', '__m_ge__', 'value() >= ' + exprVal);
	menuItemAddText('easy-scripting-device-methods', '__m_lt__', 'value() < ' + exprVal);
	menuItemAddText('easy-scripting-device-methods', '__m_le__', 'value() <= ' + exprVal);
	menuItemAddText('easy-scripting-device-methods', '__m_value__', 'value()');
	
	// TextArea functions

	// find current ident
	function getSpaces() {
		var textAreaDOM = textArea.get(0),
		    start = textAreaDOM.selectionStart;
		
		var textToPosition = textArea.val().substr(0, start),
		    ident = '',
		    ch,
		    i = 1;
		
		while ((ch = textToPosition.substr(-i, 1)) === ' ' || ch === '\t') {
			i++;
			ident = ch + ident;
		}
		
		return ident;
	}
	
	function getIdent() {
		var textAreaDOM = textArea.get(0),
		    start = textAreaDOM.selectionStart;
		
		var lastNL = textAreaDOM.value.substr(0, start).lastIndexOf('\n') + 1;
		// works with -1 as well
		
		var line = textAreaDOM.value.substr(lastNL, start - lastNL),
		    ident = '',
		    i = 0;
		
		while ((ch = line.substr(i, 1)) === ' ' || ch === '\t') {
			i++;
			ident += ch;
		}
		
		if (line.substr(line.length - 1, 1) === '{') {
			ident += '  ';
		}
		
		return ident;
	}
	
	// add text in textarea to cursor position or intead of selection
	function textareaTextAt(data) {
		var textAreaDOM = textArea.get(0),
			start = textAreaDOM.selectionStart;
		
		// add ident to the string
		data = data.split('\n').map(function(line, j) { return (j === 0 ? '' : getSpaces()) + line; }).join('\n');
		
		// add at position
		if (textArea.setRangeText) {
			// if setRangeText function is supported by current browser
			textArea.setRangeText(data);
		} else {
			textArea.focus();
			document.execCommand('insertText', false, data);
		}
		
		function indexOfPlaceholder(string) {
			for (var i = 0; i < placeHolders.length; i++) {
				var j = string.indexOf(placeHolders[i]);
				if (j !== -1) return j;
			}
			return -1;
		}
		
		// select first placeholder to fill if placeholder was in data
		var ii = indexOfPlaceholder(data);
		if (ii !== -1) {
			textAreaDOM.selectionStart = ii + start;
			textAreaDOM.selectionEnd = textAreaDOM.selectionStart + 1;
		}
		
		// trigger event for code highlighter
		textArea.blur();
		textArea.focus();
	}
	
	// add text in textarea to cursor position or intead of selection
	function textareaTextAtTop(data) {
		// trimEnd and addind \n is to trigger event for code highlighter
		textArea.val(data + textArea.val().trimEnd());
		textareaTextAt('\n');
	}
	
	$(textArea).click(function() {
		if (this.selectionStart === this.selectionEnd && placeHolders.indexOf(this.value.substr(this.selectionStart, 1)) !== -1) {
			this.selectionEnd = this.selectionStart + 1;
		} else if (this.selectionStart === this.selectionEnd && placeHolders.indexOf(this.value.substr(this.selectionStart - 1, 1)) !== -1) {
			this.selectionEnd = this.selectionStart;
			this.selectionStart--;
		}
	});
	
	$(textArea).keypress(function(e) {
		if (e.key === '.') {
			// check that before is vdev("...")
			if (this.value.substr(0, this.selectionStart).match(/.*vdev\("[\w-]+"\)$/)) {
				// get cursor position
				var pos = getCaretCoordinates(this, this.selectionEnd),
				    thisPos = this.getBoundingClientRect();
				pos.top += thisPos.top + 10; // add small shift
				pos.left += thisPos.left + 10; 
				menuOpen('easy-scripting-device-methods', pos);
			}
		} else if (e.key === 'Enter') {
			var ident = getIdent();
			setTimeout(function() {
					textareaTextAt(ident);
			}, 0);
		} else {
			menuClose('easy-scripting-device-methods');
		}
	});
	
	// highlight description
	
	document.querySelectorAll('pre code').forEach(function(block) {
		hljs.highlightBlock(block);
	});
	
	// trigger highlight
	
	textareaTextAtTop('');
}
