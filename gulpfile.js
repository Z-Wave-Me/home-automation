var gulp = require('gulp'),
    mocha = require('gulp-mocha'),
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    js_locations = [
        './classes/*.js',
        './modules/**/*.js',
        './webserver.js',
        './storage.js',
        './router.js',
        './request.js',
        './main.js',
        './apitests/*.js'
    ];


// validate
gulp.task('lint', function() {
    return gulp.src(js_locations)
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('jscs', function () {
    return gulp.src(js_locations)
        .pipe(jscs());
});

// tasks
gulp.task('mocha', function () {
    return gulp.src('apitests/index.js', {read: false})
        .pipe(mocha({reporter: 'nyan'}));
});
gulp.task('validate', ['lint', 'jscs']);