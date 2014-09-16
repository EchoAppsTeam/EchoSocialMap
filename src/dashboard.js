(function($) {
"use strict";

if (Echo.AppServer.Dashboard.isDefined("Echo.Apps.SocialMap.Dashboard")) return;

var dashboard = Echo.AppServer.Dashboard.manifest("Echo.Apps.SocialMap.Dashboard");

dashboard.inherits = Echo.Utils.getComponent("Echo.AppServer.Dashboards.AppSettings");

dashboard.mappings = {
	"dependencies.appkey": {
		"key": "dependencies.StreamServer.appkey"
	}
};

dashboard.dependencies = [{
	"url": "{config:cdnBaseURL.apps.appserver}/controls/configurator.js",
	"control": "Echo.AppServer.Controls.Configurator"
}, {
	"url": "{config:cdnBaseURL.apps.dataserver}/full.pack.js",
	"control": "Echo.DataServer.Controls.Pack"
}, {
	"url": "{%= appBaseURLs.prod %}/colorpicker.js"
}, {
	"url": "{%= appBaseURLs.prod %}/slider.js"
}];

dashboard.config.ecl = [{
	"name": "targetURL",
	"component": "Echo.DataServer.Controls.Dashboard.DataSourceGroup",
	"type": "string",
	"required": true,
	"config": {
		"title": "",
		"labels": {
			"dataserverBundleName": "Echo Social Map Auto-Generated Bundle for {instanceName}"
		},
		"apiBaseURLs": {
			"DataServer": "{%= apiBaseURLs.DataServer %}/"
		},
		"bundle": {
			"input": {
				"data": {"rules": [
					'include | geo',
					'streamserver.add-markers:"geo.location:${geo.longitude};${geo.latitude},geo.marker" | geo'
				]}
			}
		}
	}
}, {
	"component": "Group",
	"name": "presentation",
	"type": "object",
	"config": {
		"title": "Presentation"
	},
	"items": [{
		"component": "Select",
		"name": "visualization",
		"type": "string",
		"default": "us",
		"config": {
			"title": "Coverage",
			"desc": "Specifies the coverage area of the map",
			"options": [{
				"title": "United States only",
				"value": "us"
			}, {
				"title": "World",
				"value": "world"
			}]
		}
	}, {
		"component": "Colorpicker",
		"name": "mapColor",
		"type": "string",
		"default": "#D8D8D8",
		"config": {
			"title": "Map color",
			"desc": "Specifies the color of the map"
		}
	}, {
		"component": "Colorpicker",
		"name": "pinBodyColor",
		"type": "string",
		"default": "#3C3C3C",
		"config": {
			"title": "Pin color",
			"desc": "Specifies pin color"
		}
	}, {
		"component": "Colorpicker",
		"name": "pinBorderColor",
		"type": "string",
		"default": "#3C3C3C",
		"config": {
			"title": "Pin border color",
			"desc": "Specifies pin border color"
		}
	}, {
		"component": "Slider",
		"name": "pinShowSpeed",
		"type": "string",
		"default": "100",
		"config": {
			"title": "Pin appearance speed",
			"desc": "Specifies pin appearance animation speed (in milliseconds)",
			"min": 0,
			"max": 1000,
			"step": 100,
			"unit": "ms"
		}
	}, {
		"component": "Slider",
		"name": "pinFadeOutSpeed",
		"type": "string",
		"default": "2000",
		"config": {
			"title": "Pin removal speed",
			"desc": "Specifies pin removal animation speed (in milliseconds)",
			"min": 0,
			"max": 3000,
			"step": 100,
			"unit": "ms"
		}
	}, {
		"component": "Slider",
		"name": "pinDisplayTime",
		"type": "string",
		"default": "5000",
		"config": {
			"title": "Pin display duration",
			"desc": "Specifies the time which the pin remains on the map (in milliseconds)",
			"min": 0,
			"max": 10000,
			"step": 1000,
			"unit": "ms"
		}
	}, {
		"component": "Checkbox",
		"name": "renderHistoricalData",
		"type": "boolean",
		"default": true,
		"config": {
			"title": "Render historical pins",
			"desc": "Specifies if items (pins) posted before a page was opened should be displayed on the map. If set to 'No', only new pins will be displayed on the map as they come in."
		}
	}]
}, {
	"component": "Group",
	"name": "dependencies",
	"type": "object",
	"config": {
		"title": "Dependencies",
		"expanded": false
	},
	"items": [{
		"component": "Select",
		"name": "appkey",
		"type": "string",
		"config": {
			"title": "StreamServer application key",
			"desc": "Specifies the application key for this instance",
			"options": []
		}
	}]
}];

dashboard.init = function() {
	this.parent();
};

dashboard.modifiers = {
	"dependencies.appkey": {
		"endpoint": "customer/{self:user.getCustomerId}/appkeys",
		"processor": function() {
			return this.getAppkey.apply(this, arguments);
		}
	},
	"targetURL": {
		"endpoint": "customer/{self:user.getCustomerId}/subscriptions",
		"processor": function() {
			return this.getBundleTargetURL.apply(this, arguments);
		}
	}
};

dashboard.methods.declareInitialConfig = function() {
	return {
		"targetURL": this.assembleTargetURL(),
		"dependencies": {
			"StreamServer": {
				"appkey": this.getDefaultAppKey()
			}
		}
	};
};

Echo.AppServer.Dashboard.create(dashboard);

})(Echo.jQuery);
