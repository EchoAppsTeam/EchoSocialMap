(function($) {
"use strict";

if (Echo.AppServer.App.isDefined("Echo.AppServer.Controls.Configurator.GridItems.Colorpicker")) return;

var isColorPickerSupported; // "color" input feature detection flag storage

var colorpicker = Echo.AppServer.App.manifest("Echo.AppServer.Controls.Configurator.GridItems.Colorpicker");

colorpicker.inherits = Echo.Utils.getComponent("Echo.AppServer.Controls.Configurator.GridItems.Input");

colorpicker.config = {
	"setValueDebounceTimeout": 1500 // in ms
};

colorpicker.labels = {
	"picker": "Click to pick a color"
};

// we subscribe to the "onChange" event here to update "color" input
// with the respective value. Text input field behaviour is handled
// by the parent "Input" class.
colorpicker.events = {
	"Echo.AppServer.Controls.Configurator.Item.onChange": function() {
		if (this._isColorpickerSupported()) {
			this.view.get("colorpicker").val(this.get("data.value"));
		}
	}
};

colorpicker.methods.template = function() {
	return this.templates[this._isColorpickerSupported() ? "picker" : "main"];
};

colorpicker.templates.picker =
	'<div class="{inherited.class:container} {class:container}">' +
		'<div class="{inherited.class:header} {class:header}">' +
			'<div class="{inherited.class:headerPane} {class:headerPane} clearfix">' +
				'<div class="{inherited.class:valueContainer} {class:valueContainer}">' +
					'<div class="{inherited.class:link} {class:link} pull-right"></div>' +
					'<input class="{inherited.class:input} {class:colorpicker} echo-clickable" type="color" value="{data:value}" title="{label:picker}" />' +
					'<div class="{inherited.class:value} {class:value}"></div>' +
					'<input class="input-block-level {inherited.class:input} {class:input}" type="text" />' +
					'<div class="echo-clear"></div>' +
				'</div>' +
				'<div class="{inherited.class:titleContainer} {class:titleContainer}">' +
					'<span class="{inherited.class:title} {class:title}">{config:title}</span>' +
				'</div>' +
			'</div>' +
		'</div>' +
	'</div>';

colorpicker.renderers.colorpicker = function(element) {
	var item = this;
   
	// we can not react on every color picker change, since it might produce
	// a lot of load on a server and slow down the client side performance,
	// so we debounce actual value application, while keeping visual value
	// representation updates in UI instant
	var setValueDebounced = Echo.Utils.debounce(function() {
		var value = element.val();
		item.setValue(value);
		item.view.render({"name": "input"});
		item.view.render({"name": "value"});
	}, this.config.get("setValueDebounceTimeout"));

	return element.off("input").on("input", setValueDebounced);
};

colorpicker.methods._isColorpickerSupported = function() {
	if (isColorPickerSupported === undefined) {
		var element = document.createElement("input");
		element.setAttribute("type", "color");
		isColorPickerSupported = (element.type !== "text");
	}
	return isColorPickerSupported;
};

colorpicker.css =
	'.{class:container} div.{class:value} { float: left; }' +
	'.{class:container} input[type="color"].{class:colorpicker} { float: left; border: 0px; background: none; outline: none; width: 25px; height: 25px; margin: 6px 7px 0px 0px; padding: 0px; }' +
	'.{class:container} .{class:valueContainer} input[type="text"].{class:input} { float: left; width: calc(100% - 50px); }';

Echo.AppServer.App.create(colorpicker);

})(Echo.jQuery);
