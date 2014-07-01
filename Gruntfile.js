module.exports = function(grunt) {
	"use strict";

	var shared = require("./grunt/lib.js").init(grunt);

	grunt.loadTasks("grunt/tasks");
	grunt.loadNpmTasks("grunt-contrib-clean");
	grunt.loadNpmTasks("grunt-contrib-concat");
	grunt.loadNpmTasks("grunt-contrib-copy");
	grunt.loadNpmTasks("grunt-contrib-jshint");
	grunt.loadNpmTasks("grunt-contrib-uglify");
	grunt.loadNpmTasks("grunt-contrib-watch");
	grunt.loadNpmTasks("sphere");

	grunt.registerTask("default", ["check-environment:" + shared.config("env"), "jshint", "clean:all", "build"]);

	var sources = {
		"js": [
			"app.js",
			"dashboard.js"
		],
		"images": [
			"images/**"
		],
		"demo": [
			"demo.html",
			"demo.us.html",
			"demo.world.html"
		]
	};

	var config = {
		"dirs": {
			"build": "build",
			"dest": "web",
			"dist": "web"
		},
		"sources": sources,
		"pkg": grunt.file.readJSON("package.json"),
		"banner":
			"/**\n" +
			" * Copyright 2012-<%= grunt.template.today(\"UTC:yyyy\") %> <%= pkg.author.name %>.\n" +
			" * Licensed under the Apache License, Version 2.0 (the \"License\");\n" +
			" * you may not use this file except in compliance with the License.\n" +
			" * You may obtain a copy of the License at\n" +
			" *\n" +
			" * http://www.apache.org/licenses/LICENSE-2.0\n" +
			" *\n" +
			" * Unless required by applicable law or agreed to in writing, software\n" +
			" * distributed under the License is distributed on an \"AS IS\" BASIS,\n" +
			" * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.\n" +
			" * See the License for the specific language governing permissions and\n" +
			" * limitations under the License.\n" +
			" *\n" +
			" * Version: <%= pkg.version %> (<%= grunt.template.today(\"UTC:yyyy-mm-dd HH:MM:ss Z\") %>)\n" +
			" */\n",
		"clean": {
			"build": [
				"<%= dirs.build %>/*"
			],
			"all": [
				"<%= dirs.dist %>/*",
				"<%= clean.build %>"
			]
		},
		"copy": {
			"js": {
				"src": "<%= sources.js %>",
				"dest": "<%= dirs.build %>/"
			},
			"third-party": {
				"src": [
					"third-party/*.js",
					"third-party/*.css"
				],
				"dest": "<%= dirs.build %>/"
			},
			"images": {
				"src": "<%= sources.images %>",
				"dest": "<%= dirs.build %>/"
			},
			"demo": {
				"src": "<%= sources.demo %>",
				"dest": "<%= dirs.build %>/"
			},
			"manifest": {
				"src": "app-manifest.json",
				"dest": "<%= dirs.build %>/"
			},
			"build": {
				"options": {
					"processContent": shared.replacePlaceholdersOnCopy,
					"processContentExclude": "**/*.{png,jpg,jpeg,gif}"
				},
				"files": [{
					"expand": true,
					"cwd": "<%= dirs.build %>",
					"src": ["**"],
					"dest": "<%= dirs.dest %>"
				}]
			}
		},
		"concat": {
			"options": {
				"stripBanners": true,
				"banner": "<%= banner %>"
			},
			"dashboard": {
				"src": [
					"<%= dirs.build %>/dashboard.js"
				],
				"dest": "<%= dirs.build %>/dashboard.js"
			},
			"app": {
				"src": [
					"<%= dirs.build %>/app.js"
				],
				"dest": "<%= dirs.build %>/app.js"
			}
		},
		"uglify": {
			"options": {
				"report": grunt.option("verbose") ? "gzip" : "min"
			},
			"js": {
				"files": [{
					"expand": true,
					"cwd": "<%= dirs.build %>",
					"src": "<%= sources.js %>",
					"dest": "<%= dirs.build %>"
				}]
			}
		},
		"jshint": {
			"options": {
				"jshintrc": ".jshintrc"
			},
			"grunt": ["Gruntfile.js", "grunt/**/*.js"],
			"sources": ["<%= sources.js %>"]
		},
		"release": {
			"options": {
				"environment": shared.config("env"),
				"debug": shared.config("debug"),
				"configFile": "config/release.json",
				"location": shared.config("env") === "staging" ? "sandbox" : "cdn",
				"remoteRoot": shared.config("env") === "staging" ? "/staging" : "",
				"purgeTitle": "<%= pkg.name %>",
				"purgePaths": [
					"/apps/echo/social-map/v<%= pkg.versions.stable %>/"
				]
			},
			"regular": {
				"options": {
					"deployTargets": {
						"all": {
							"src": "**",
							"cwd": "<%= dirs.dist %>/",
							"dest": "<%= release.options.remoteRoot %>/apps/echo/social-map/v<%= pkg.versions.stable %>/"
						}
					}
				}
			},
			"purge": {
				"options": {
					"skipBuild": true
				}
			}
		},
		"watch": {
			"src": {
				"files": [
					"<%= sources.js %>",
					"<%= sources.demo %>",
					"Gruntfile.js",
					"grunt/**"
				],
				"tasks": ["default"],
				"options": {
					"interrupt": true
				}
			}
		},
		"check-environment": {
			"options": {
				"list": shared.config("environments")
			}
		},
		"init-environment": {
			"options": {
				"list": shared.config("environments")
			}
		}
	};
	grunt.initConfig(config);

	var parts = grunt.config("pkg.version").split(".");
	grunt.config("pkg.versions", {
		"stable": parts.join("."),
		"latest": parts[0]
	});

	function assembleEnvConfig() {
		var env = shared.config("env");
		var envFilename = "config/environments/" + env + ".json";
		if (!grunt.file.exists(envFilename)) return;
		var config = grunt.file.readJSON(envFilename);
		config.packageVersions = grunt.config("pkg.versions");
		grunt.config("envConfig", config);
	}
	assembleEnvConfig();
};
