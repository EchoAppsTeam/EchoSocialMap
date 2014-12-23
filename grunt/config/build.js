module.exports = {
	options: {
		tasks: {
			dev: [
				'copy:third-party',
				'copy:js',
				'concat'
			],
			min: [
				'copy:third-party',
				'copy:js',
				'uglify',
				'concat'
			]
		}
	}
};
