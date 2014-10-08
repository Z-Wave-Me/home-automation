var less = require('gulp-less');
var gulp = require('gulp');
var minifyCSS = require('gulp-minify-css');
var sourcemaps = require('gulp-sourcemaps');
var cssBase64 = require('gulp-css-base64');

gulp.task('less', function () {
    gulp.src('./htdocs/public/less/all.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(cssBase64())
        .pipe(sourcemaps.write('./'))
        .pipe(minifyCSS({keepBreaks:true}))
        .pipe(gulp.dest('./dist/public/css'));

    gulp.src('./htdocs/public/fonts/*')
        .pipe(gulp.dest('./dist/public/fonts'));
});