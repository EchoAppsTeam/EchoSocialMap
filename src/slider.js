(function($) {
"use strict";

if (Echo.AppServer.App.isDefined("Echo.AppServer.Controls.Configurator.GridItems.Slider")) return;

var isSliderSupported; // "range" input feature detection flag storage

var slider = Echo.AppServer.App.manifest("Echo.AppServer.Controls.Configurator.GridItems.Slider");

slider.inherits = Echo.Utils.getComponent("Echo.AppServer.Controls.Configurator.GridItems.Input");

slider.config = {
	"min": undefined,
	"max": undefined,
	"unit": "",
	"step": undefined,
	"setValueDebounceTimeout": 1500 // in ms
};

slider.methods.template = function() {
	var isValidConfig = this.config.get("min") !== undefined &&
				this.config.get("max") !== undefined;
	// we can not build a proper "range" element without "min" and "max"
	// parameters defined in the config, so we fall back to the "Input" template
	return this.templates[this._isSliderSupported() && isValidConfig ? "slider" : "main"];
};

slider.templates.slider =
	'<div class="{inherited.class:container} {class:container}">' +
		'<div class="{inherited.class:header} {class:header}">' +
			'<div class="{inherited.class:headerPane} {class:headerPane} clearfix">' +
				'<div class="{inherited.class:valueContainer} {class:valueContainer}">' +
					'<div class="{inherited.class:link} {class:link} pull-right"></div>' +
					'<div class="{class:value}"></div>' +
					'<input class="{class:slider}" type="range" value="{data:value}" min="{config:min}" max="{config:max}" step="{config:step}" />' +
					'<div class="echo-clear"></div>' +
				'</div>' +
				'<div class="{inherited.class:titleContainer} {class:titleContainer}">' +
					'<span class="{inherited.class:title} {class:title}">{config:title}</span>' +
				'</div>' +
			'</div>' +
		'</div>' +
	'</div>';


slider.renderers.value = function(element, extra) {
	extra = extra || {};
	return element.text((extra.value || this.get("data.value")) + " " + this.config.get("unit"));
};

slider.renderers.slider = function(element) {
	var item = this;

	// we can not react on every slider change, since it might produce
	// a lot of load on a server and slow down the client side performance,
	// so we debounce actual value application, while keeping visual value
	// representation (left to the slider element) updates instant
	var setValueDebounced = Echo.Utils.debounce(function() {
		item.setValue(element.val());
	}, this.config.get("setValueDebounceTimeout"));

	return element.off("input").on("input", function() {
		setValueDebounced();
		item.view.render({"name": "value", "extra": {"value": element.val()}});
	});
};

slider.methods._isSliderSupported = function() {
	if (isSliderSupported === undefined) {
		var element = document.createElement("input");
		element.setAttribute("type", "range");
		isSliderSupported = (element.type !== "text");
	}
	return isSliderSupported;
};

slider.css =
	'.{class:container} div.{class:value} { float: left; width: 35%; padding-right: 5px; font-size: 12px; color: #333; line-height: 36px; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; box-sizing: border-box; }' +
	'.{class:container} input[type="range"].{class:slider} { float: left; width: 60%; margin: 11px 0px 0px 0px; }';

Echo.AppServer.App.create(slider);

})(Echo.jQuery);
