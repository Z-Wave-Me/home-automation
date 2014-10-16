var gulp = require('gulp'),
    less = require('gulp-less'),
    minifyCSS = require('gulp-minify-css'),
    sourcemaps = require('gulp-sourcemaps'),
    cssBase64 = require('gulp-css-base64'),
    concat = require("gulp-concat"),
    rjs = require('gulp-requirejs'),
    uglify = require('gulp-uglify'),
    autoprefixer = require('gulp-autoprefixer'),
    connect = require('gulp-connect'),
    mocha = require('gulp-mocha'),
    jshint = require('gulp-jshint'),
    jscs = require('gulp-jscs'),
    manifest = require('gulp-manifest'),
    rename = require("gulp-rename");

gulp.task('less', function () {
    gulp.src('./htdocs/public/less/all.less')
        .pipe(sourcemaps.init())
        .pipe(less())
        .pipe(cssBase64())
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        //.pipe(sourcemaps.write('./'))
        .pipe(minifyCSS({keepBreaks:true}))
        .pipe(gulp.dest('./dist/public/css'));

    gulp.src('./htdocs/public/fonts/*')
        .pipe(gulp.dest('./dist/public/fonts'));
});

gulp.task("build", function () {

    rjs({
        baseUrl: './htdocs/js',
        name: 'main',
        mainConfigFile: 'htdocs/js/main.js',
        include: [
            'requireLib',
            'Preferences',
            'Notifications',
            'App',
            'Widgets',
            'Load',
            './bootstrap'
        ],
        out: 'main-built.js'
    })
        .pipe(uglify())
        .pipe(gulp.dest('./dist/js')); // pipe it to the output DIR

});

gulp.task('manifest', function(){
    gulp.src([
        'dist/*',
        'dist/**/*.*'
    ])
        .pipe(manifest({
            hash: true,
            preferOnline: true,
            network: ['http://*', 'https://*', '*'],
            filename: 'app.manifest',
            exclude: 'app.manifest'
        }))
        .pipe(gulp.dest('dist'));
});

gulp.task('create_index', function () {
    return gulp.src("./index.tmpl.html")
        .pipe(rename("index.html"))
        .pipe(gulp.dest("./dist"));
});


// validate
gulp.task('lint', function() {
    return gulp.src('htdocs/js/**/*.js')
        .pipe(jshint())
        .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('jscs', function () {
    return gulp.src('htdocs/js/**/*.js')
        .pipe(jscs());
});

// server

gulp.task('connect', function() {
    connect.server({
        root: 'htdocs',
        livereload: true
    });
});

gulp.task('reload', function () {
    gulp.src('./htdocs/js/**/*.js')
        .pipe(connect.reload());
});

gulp.task('watch', function () {
    gulp.watch([
        './htdocs/js/**/*.js'
    ], ['reload']);
});


// tasks
gulp.task('default', ['less', 'build', 'create_index'], function () {
    gulp.run('manifest');
});
gulp.task('develop_server', ['connect', 'watch']);
gulp.task('mocha', function () {
    return gulp.src('apitests/index.js', {read: false})
        .pipe(mocha({reporter: 'nyan'}));
});
gulp.task('validate', ['lint', 'jscs']);