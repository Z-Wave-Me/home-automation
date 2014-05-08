module.exports = function (grunt) {

    require('load-grunt-tasks')(grunt);
    grunt.initConfig({

        pkg: grunt.file.readJSON('package.json'),

        jshint: {
            files: [
                'htdocs/js/collections/*.js',
                'htdocs/js/helpers/*.js',
                'htdocs/js/models/*.js',
                'htdocs/js/modules/*.js',
                'htdocs/js/views/**/*.js',
                'htdocs/js/views/*.js'
            ],
            options: {
                "browser": true,
                globals: {
                    jQuery: true,
                    console: true,
                    module: true,
                    '_': true,
                    '$': true,
                    Backbone: true,
                    window: true,
                    BL: true,
                    define: true,
                    "zway": true,
                    "inherits": true,
                    "AutomationControler": true,
                    "AutomationModule": true,
                    "VirtualDevice": true
                }
            }
        },

        clean: ["htdocs/dist/"],

        requirejs: {
            compile: {
                options: {
                    mainConfigFile: 'htdocs/js/build.js',
                    baseUrl: "htdocs/js/",
                    name: "main",
                    include: ['libs/require/require.js', 'libs/vendor/modernizr-2.6.2-respond-1.1.0.min.js', 'build'],
                    out: 'htdocs/dist/js/main.min.js',
                    generateSourceMaps: true,
                    preserveLicenseComments: false
                }
            }
        },

        htmlmin: {
            dist: {
                options: {
                    removeComments: true,
                    collapseWhitespace: true
                },

                files: {
                    'htdocs/dist/index.html': 'htdocs/dist/index.html'
                }
            }
        },

        less: {
            development: {
                options: {
                    compress: true,
                    yuicompress: true,
                    optimization: 2,
                    cleancss: true
                },
                files: {
                    "htdocs/dist/public/css/alltemp.css": "htdocs/dist/public/less/all.less"
                }
            }
        },

        css_img_2_data_uri: {
            options: {
                files: [
                    {
                        src: 'htdocs/dist/public/css/alltemp.css',
                        dest: 'htdocs/dist/public/css/all.css'
                    }
                ]
            }
        },

        manifest: {
            generate: {
                options: {
                    cache: [
                        'htdocs/dist/js/libs/require/require.js',
                        'htdocs/dist/main.min.js',
                        'htdocs/dist/**/*.*'
                    ],
                    exclude: ['node_modules/'],
                    network: ['*'],
                    master: ['index.html']
                },
                src: [
                    'htdocs/dist/js/**/*.js',
                    'htdocs/dist/templates/**/*.html',
                    'htdocs/dist/public/**/*.{png, gif, jpg, jpeg, eot, svg, ttf, woff}',
                    'htdocs/dist/img/**/*.{png, gif, jpg, jpeg}'
                ],
                dest: 'htdocs/dist/manifest.appcache'
            }
        },

        watch: {
            scripts: {
                files: [
                    'htdocs/js/**/*.js',
                    'htdocs/templates/**/*.html',
                    'htdocs/less/**/*.less',
                    'htdocs/img/**/*.{png, gif, jpg, jpeg}',
                    'Gruntfile.js'
                ],
                tasks: ['jshint']
            }
        },

        mochaTest: {
            test: {
                options: {
                    reporter: 'spec'
                },
                src: ['apitests/*.js']
            }
        },

        copy: {
            main: {
                files: [
                    {expand: true, cwd: 'htdocs/', src: ['public/**'], dest: 'htdocs/dist/'},
                    {expand: true, cwd: 'htdocs/', src: ['js/**'], dest: 'htdocs/dist/'},
                    {expand: true, cwd: 'htdocs/', src: ['templates/**'], dest: 'htdocs/dist/'}
                ]
            }
        },

        mkdir: {
            all: {
                options: {
                    mode: '0755',
                    create: ['htdocs/dist/public/css']
                }
            }
        },

        index: {
            src: 'index.tmpl.html',  // source template file
            dest: 'htdocs/dist/index.html'  // destination file (usually index.html)
        }
    });

    grunt.registerTask("index", "Generate index.html depending on configuration", function () {
        var conf = grunt.config('index'),
            tmpl = grunt.file.read(conf.src);

        grunt.file.write(conf.dest, grunt.template.process(tmpl));

        grunt.log.writeln('Generated \'' + conf.dest + '\' from \'' + conf.src + '\'');
    });

    //grunt.registerTask('default', ['clean', 'requirejs', 'less', 'htmlmin', 'css_img_2_data_uri', 'manifest']);
    grunt.registerTask('default', 'mochaTest', ['clean', 'copy', 'mkdir', 'index', 'less', 'requirejs', 'htmlmin', 'index', 'manifest', 'css_img_2_data_uri']);
};