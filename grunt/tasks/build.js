module.exports = function(grunt) {
	"use strict";

	var shared = require("../lib.js").init(grunt);

	grunt.registerTask("build", "Go through all stages of building some target/system", function(stage) {
		var tasks = [];
		if (!stage) {
			tasks = ["build:dev"];
			if (shared.config("env") !== "development") {
				tasks.push("build:min");
			}
			tasks.push("build:final");
			grunt.task.run(tasks);
			return;
		}
		grunt.config("dirs.dest", "<%= dirs.dist %>" + (stage === "dev" ? "/dev" : ""));
		switch(stage) {
			case "dev":
				tasks = [
					"copy:third-party",
					"copy:js",
					"concat"
				];
				break;
			case "min":
				tasks = [
					"copy:third-party",
					"copy:js",
					"uglify",
					"concat"
				];
				break;
			case "final":
				tasks = [
					"copy:demo",
					"copy:images",
					"copy:manifest"
				];
				break;
		}
		tasks = tasks.concat([
			"copy:build",
			"clean:build"
		]);
		grunt.task.run(tasks);
	});
};
