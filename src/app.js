// SocialMap app uses LeafletJS for map visualization.
// More info on LeafletJS can be found here: http://leafletjs.com
(function($) {
"use strict";

var socialmap = Echo.App.manifest("Echo.Apps.SocialMap");

if (Echo.App.isDefined(socialmap)) return;

socialmap.vars = {
	// events list to maintain a number of last seen events to make
	// a map feel real-time in case of slow incoming data rate
	"pins": [],
	"timeouts": {}
};

socialmap.labels = {
	"noData": "No data yet.<br>Stay tuned!"
};

socialmap.config = {
	"targetURL": undefined,
	"viewportChangeTimeout": 50,
	"minHistoricalPinsQueue": 5,    // min queue size to start historical pins
					// carousel (in case "renderHistoricalData" = true)
	"maxHistoricalPinsQueue": 50,
	"presentation": {
		"visualization": "us",
		"mapColor": "#D8D8D8",
		"pinBodyColor": "#3C3C3C",
		"pinBorderColor": "#3C3C3C",
		"pinShowSpeed": "100",
		"pinFadeOutSpeed": "2000",
		"pinDisplayTime": "5000",
		"pinDefaultSize": 8, // in px, pin size at 1x map scale
		"renderHistoricalData": true,
		"pinsRenderingTimeoutRange": [1, 3] // [min, max] in seconds
	},
	"dependencies": {
		"StreamServer": {
			"appkey": undefined,
			"apiBaseURL": "{%= apiBaseURLs.StreamServer.basic %}/",
			"liveUpdates": {
				"transport": "websockets",
				"enabled": true,
				"websockets": {
					"URL": "{%= apiBaseURLs.StreamServer.ws %}/"
				}
			}
		}
	}
};

socialmap.dependencies = [{
	"url": "{config:cdnBaseURL.sdk}/api.pack.js",
	"control": "Echo.StreamServer.API"
}, {
	"url": "{%= appBaseURLs.prod %}/third-party/leaflet.css"
}, {
	"url": "{%= appBaseURLs.prod %}/third-party/leaflet.js",
	"loaded": function() { return !!window.L; }
}];

socialmap.init = function() {
	var app = this;

	// check for "targetURL" field, without
	// this field we are unable to retrieve any data
	if (!this.config.get("targetURL")) {
		this.showMessage({
			"type": "error",
			"message": "Unable to retrieve data, target URL is not specified."
		});
		return;
	}

	var map = this.config.get("presentation.visualization");
	this._loadGeoJSON(map, function() {
		var presentation = app.config.get("presentation");
		// save reference to GEO data object
		app.set("geo", Echo.Variables.GEO[presentation.visualization]);
		app._requestData({
			"onData": function(data, options) {
				var includeHistoricalPins = presentation.renderHistoricalData;
				if (includeHistoricalPins) {
					app.set("pins", app._extractValidPins(data));
				}

				app.render();

				// we need to wait until the "render" function is executed
				// for elements to be appended into the DOM tree and be
				// laid out by the browser. Otherwise it wouldn't have a
				// width/height yet and Leaflet does NOT like that
				if (app._hasData()) {
					app._renderMap();
				}

				if (includeHistoricalPins) {
					app._carouselHistoricalPins(app.get("pins"));
				}
				app.ready();
			},
			"onUpdate": function(data) {
				var pins = app._extractValidPins(data);
				if (!pins || !pins.length) return;

				if (!app._hasData()) {
					app.set("pins", pins);
					app.render();
					app._renderMap();
				} else if (app.config.get("presentation.renderHistoricalData")) {
					app._actualizeHistoricalPins(pins);
				}
				app._renderNewPins(app.get("pins"));
			},
			"onError": function(data, options) {
				var isCriticalError =
					typeof options.critical === "undefined" ||
					options.critical && options.requestType === "initial";

				if (isCriticalError) {
					app.showError(data, $.extend(options, {
						"request": app.request
					}));
				}
			}
		});
	});
};

socialmap.destroy = function() {
	// cleanup pin rendering timeouts
	var timeouts = this.get("timeouts");
	$.each(timeouts, function(id) {
		clearTimeout(id);
		delete timeouts[id];
	});

	var map = this.get("map");
	if (map) {
		map.remove();
	}
	$(window).off("resize", this._viewportResizeHandler);
};

socialmap.methods.template = function() {
	return this.templates[this._hasData() ? "main" : "empty"];
};

socialmap.templates.main =
	'<div class="{class:container}">' +
		'<div class="{class:map}"></div>' +
	'</div>';

socialmap.templates.empty =
	'<div class="{class:empty}">' +
		'<span class="{class:message}">{label:noData}</span>' +
	'</div>';

socialmap.methods._hasData = function() {
	return !!this.get("pins", []).length;
};

socialmap.methods._assembleQuery = function() {
	var query = "childrenof:{config:targetURL} " +
		"itemsPerPage:{config:maxHistoricalPinsQueue} " +
		"markers:geo.marker children markers:geo.marker";
	return this.substitute({"template": query});
};

socialmap.methods._loadGeoJSON = function(visualization, callback) {
	var url = "{%= appBaseURLs.prod %}/third-party/geo." + visualization + ".js";
	Echo.Loader.download([{"url": url}], callback);
};

socialmap.methods._requestData = function(handlers) {
	var ssConfig = this.config.get("dependencies.StreamServer");
	// keep a reference to a request object in "this" to trigger its
	// automatic sweeping out on Echo.Control level at app destory time
	this.request = Echo.StreamServer.API.request({
		"endpoint": "search",
		"secure": this.config.get("useSecureAPI"),
		"apiBaseURL": ssConfig.apiBaseURL,
		"data": {
			"q": this._assembleQuery(),
			"appkey": ssConfig.appkey
		},
		"liveUpdates": $.extend(ssConfig.liveUpdates, {
			"onData": handlers.onUpdate
		}),
		"onError": handlers.onError,
		"onData": handlers.onData
	});
	this.request.send();
};

socialmap.methods._extractGeoLocationInfo = function(entry) {
	var latlng;
	// A geo-location marker looks like this,
	// using the standard rule in DataServer:
	//    geo.location:-117.57980013;33.46756302
	$.map(entry.object.markers || [], function(marker) {
		if (!/^geo.location:/.test(marker)) return;
		var parts = marker.split(":")[1].split(";");
		latlng = [parseFloat(parts[1]), parseFloat(parts[0])];
	});
	return latlng;
};

socialmap.methods._getPinTransitionCSS = function(transform, duration) {
	var prefixes = ["-o-", "-ms-", "-webkit-", "-moz-", ""];
	return Echo.Utils.foldl({}, prefixes, function(prefix, acc) {
		acc[prefix + "transition-timing-function"] = "ease-out";
		acc[prefix + "transition-duration"] = duration + "ms";
		acc[prefix + "transform"] = transform;
	});
};

socialmap.methods._log2 = function(value) {
	return Math.log2 ? Math.log2(value) : (Math.log(value) / Math.log(2));
};

socialmap.methods._getMapZoom = function(mapWidth) {
	var baseWidth = this.get("geo.defaultSize")[0];
	// note: adding 0.8 to start with 1x scale (vs 0x),
	//       adding 0.8, not 1 to fit map on a screen
	//       and center it (making zoom a bit smaller)
	return parseFloat((this._log2(mapWidth / baseWidth) + 0.8).toFixed(2));
};

socialmap.methods._getMapHeight = function(mapWidth) {
	var defaultSize = this.get("geo.defaultSize");
	// we get width/height proportion for default size and calculate
	// the necessary height using it, according to the given width
	return Math.round(mapWidth / (defaultSize[0] / defaultSize[1]));
};

socialmap.methods._extractValidPins = function(data) {
	var app = this;
	// gather valid (with geo data) pins only
	return Echo.Utils.foldl([], data.entries || [], function(entry, acc) {
		var loc = app._extractGeoLocationInfo(entry);
		if (loc) {
			acc.push([loc, entry]);
		}
	});
};

socialmap.methods._actualizeHistoricalPins = function(pins) {
	var max = this.config.get("maxHistoricalPinsQueue");
	var historicalPins = this.get("pins").concat(pins);
	if (historicalPins.length > max) {
		historicalPins.splice(0, historicalPins.length - max);
	}
	this.set("pins", historicalPins);
};

socialmap.methods._repeatWithRandomInterval = function(func) {
	var app = this;
	var interval = this.config.get("presentation.pinsRenderingTimeoutRange");
	(function iterate() {
		var timeout = setTimeout(function() {
			clearTimeout(timeout);
			delete app.get("timeouts")[timeout];
			var stopIterating = func();
			if (!stopIterating) {
				iterate();
			}
		}, Echo.Utils.random.apply(null, interval) * 1000);

		// keep timeout reference to kill it at "destroy"
		app.get("timeouts")[timeout] = true;
	})();
};

socialmap.methods._carouselHistoricalPins = function(pins) {
	var app = this;
	this._repeatWithRandomInterval(function() {
		var pins = app.get("pins");
		if (pins.length && pins.length >= app.config.get("minHistoricalPinsQueue")) {
			var max = app.config.get("maxHistoricalPinsQueue");
			var id = Echo.Utils.random(1, Math.min(pins.length, max)) - 1;
			var pin = pins[id];
			if (pin && pin.length) {
				app._renderPin(pin[0], pin[1]);
			}
		}
	});
};

socialmap.methods._renderNewPins = function(pins) {
	if (!pins || !pins.length) return;

	var app = this, idx = 0;
	this._repeatWithRandomInterval(function() {
		var pin = pins[idx];
		if (pin) {
			app._renderPin(pin[0], pin[1]);
		}
		idx++;
		return (idx === pins.length);
	});
};

socialmap.methods._renderPin = function(latlng, entry) {
	var app = this,
		map = app.get("map"),
		pinSize = app.get("zoom") * app.config.get("presentation.pinDefaultSize");

	var icon = L.divIcon({
		"className": "echo-apps-socialmap-pin",
		"iconSize": [pinSize, pinSize]
	});
	var marker = L.marker(latlng, {"icon": icon, "opacity": 1}).addTo(map);

	var pinCSS = $.extend({
		"opacity": "0.5",
		"border-radius": "50%", // make it a cirlce
		"background": app.config.get("presentation.pinBodyColor"),
		"border": "1px solid " + app.config.get("presentation.pinBorderColor"),
		"width": pinSize,
		"height": pinSize
	}, app._getPinTransitionCSS("scale(0)", "0"));
	var circle = $('<div class="echo-apps-socialmap-marker"></div>').css(pinCSS);
	$(marker._icon).append(circle);

	// timeout is used to init CSS transition
	setTimeout(function() {
		var duration = app.config.get("presentation.pinShowSpeed");
		circle.css(app._getPinTransitionCSS("scale(1)", duration));
	}, 50);

	// wait a given number of ms and fade out
	setTimeout(function() {
		var duration = app.config.get("presentation.pinFadeOutSpeed");
		circle.css(app._getPinTransitionCSS("scale(0)", duration));

		// remove marker as soon as an animation is over to avoid memory leaks
		setTimeout(function() {
			map.removeLayer(marker);
		}, parseInt(app.config.get("presentation.pinFadeOutSpeed")));

	}, parseInt(app.config.get("presentation.pinDisplayTime")));
};

socialmap.methods._renderMap = function() {
	var app = this,
		map,
		mapView = app.view.get("map"),
		timeout = app.config.get("viewportChangeTimeout");

	var _viewportResizeHandler = function() {
		var width = mapView.width();
		var zoom = app._getMapZoom(width);
		app.set("zoom", zoom);
		mapView.height(app._getMapHeight(width));
		if (map) {
			map.setView(app.get("geo.center"), zoom, {"reset": true});
		}
	};

	// store debounced version of the function
	this._viewportResizeHandler = Echo.Utils.debounce(_viewportResizeHandler, timeout);

	// trigger zoom/height calculations
	_viewportResizeHandler();

	$(window).bind("resize", this._viewportResizeHandler);

	// more information on the options below can be found
	// on Leaflet docs: http://leafletjs.com/reference.html
	map = new L.map(mapView.get(0), {
		"center": app.get("geo.center"),
		"zoom": app.get("zoom"),
		"minZoom": 0.1,
		"maxZoom": 5,
		"dragging": false,
		"touchZoom": false,
		"scrollWheelZoom": false,
		"doubleClickZoom": false,
		"boxZoom": false,
		"keyboard": false,
		"zoomControl": false,
		"trackResize": true,
		"attributionControl": false
	});
	L.geoJson(this.get("geo.json"), {
		"style": {
			"fillColor": app.config.get("presentation.mapColor"),
			"fillOpacity": 1,
			"stroke": true,
			"color": "#FFFFFF",
			"weight": 1,
			"opacity": 1
		}
	}).addTo(map);

	app.set("map", map);
};

socialmap.css =
	'.{class} .{class:map} { width: 100%; min-width: 300px; background: inherit; }' +
	'.{class:empty} { border: 1px solid #d2d2d2; background-color: #fff; margin: 0px; margin-bottom: 10px; padding: 30px 20px; text-align: center; }' +
	'.{class:empty} .{class:message} { background: url("//cdn.echoenabled.com/apps/echo/conversations/v2/sdk-derived/images/info.png") no-repeat; margin: 0 auto; font-size: 14px; font-family: "Helvetica Neue", Helvetica, "Open Sans", sans-serif; padding-left: 40px; display: inline-block; text-align: left; line-height: 16px; color: #7f7f7f; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; box-sizing: border-box; }';

Echo.App.create(socialmap);

})(Echo.jQuery);
