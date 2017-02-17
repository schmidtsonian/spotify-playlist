var autoprefixer = require('gulp-autoprefixer');
var cache           = require('gulp-cache');
var concat          = require('gulp-concat');
var connect         = require('gulp-connect');
var data            = require('gulp-data');
var debug           = require('gulp-debug');
var del             = require('del');
var fs              = require('fs');
var gulp            = require('gulp');
var gulpFilter      = require('gulp-filter');
var gutil           = require('gulp-util');
var imagemin        = require('gulp-imagemin');
var pug             = require('gulp-pug');
var jsonminify      = require('gulp-json-minify');
var lazypipe        = require('lazypipe');
var mainBowerFiles  = require('gulp-main-bower-files');
var merge           = require('merge2');
var mergeJsons      = require('gulp-merge-json');
var open            = require('gulp-open');
var plumber         = require('gulp-plumber');
var rename          = require('gulp-rename');
var runSequence     = require('run-sequence');
var sass            = require('gulp-sass');
var sourcemaps      = require('gulp-sourcemaps');
var ts              = require('gulp-typescript');
var typedoc         = require("gulp-typedoc");
var uglify          = require('gulp-uglify');

var path = {
    styles  : {
        src  : 'app/styles/**/*.scss',
        dest : 'public/css/',
    },
    views   : {
        src  : 'app/views/**/*.pug',
        dest : 'public/',
        filter: ['*', '**/*', '!_*.*', '!*/_*.*', '!*/**/_*.*']
    },
    images  : {
        src  :'app/assets/images/**/*.+(png|jpg|gif|svg)',
        dest : 'public/images'
    },
    fonts   : {
        src  : 'app/assets/fonts/**/*',
        dest : 'public/fonts'
    },
    jsons   : {
        src  : 'app/assets/jsons/**/*.json',
        dest : 'public/jsons',
        outTypedoc : 'public/jsons/typedoc.json',
    },
    scripts : {
        src  : 'app/typescripts/**/*.ts',
        out  : 'main.js',
        dest : 'public/js/',
        filter: ['*', '_*.*'],
        vendorConcat: 'vendor.js',
        vendorSrc : 'app/assets/vendor/*.js',
        bowerSrc : './bower.json',
    },
};

gulp.task('webserver', function() {
    connect.server({
        root: 'public',
        livereload: true,
        directoryListing: true
    });
});

gulp.task('uri', function() {
    gulp
    .src(__filename)
    .pipe(open({uri: 'http://localhost:8080'}));
});

gulp.task('clean:public', function() {
    
    return del.sync('public');
});

gulp.task('fonts', function() {
    
    return gulp
        .src(path.fonts.src)
        .pipe(gulp.dest(path.fonts.dest))
        .pipe(connect.reload());
});

gulp.task('jsons', function() {
    
    return gulp
        .src(path.jsons.src)
        .pipe(plumber())
        .pipe(jsonminify())
        .pipe(gulp.dest(path.jsons.dest))
        .on('error', gutil.log)
        .pipe(connect.reload());
});

gulp.task('imagemin', function() {
    return gulp
        .src(path.images.src)
        .pipe(imagemin())
        .pipe(gulp.dest(path.images.dest))
        .pipe(connect.reload());
} );

gulp.task('images', function() {
  return gulp
      .src(path.images.src)
      // Caching images that ran through imagemin
      .pipe(cache(imagemin({interlaced: true}) ))
      .pipe(gulp.dest(path.images.dest))
});

gulp.task('vendor-scripts', function() {

    var vendorJs = gulp
        .src(path.scripts.vendorSrc)
        .pipe(concat(path.scripts.vendorConcat));

    var bowerJs = gulp
        .src(path.scripts.bowerSrc)
        .pipe(mainBowerFiles(), { base: 'bower_components/'})
        .pipe(concat(path.scripts.vendorConcat));

    return merge(bowerJs, vendorJs)
        .pipe(concat(path.scripts.vendorConcat))
        .pipe(uglify())
        .pipe(gulp.dest(path.scripts.dest));
});

gulp.task('scripts', function () {
    return gulp
        .src(path.scripts.src)
        .pipe(sourcemaps.init())
        .pipe(ts({
                target: "ES5",
            	noImplicitAny: true,
            	out: path.scripts.out
    	    }
        ))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(path.scripts.dest))
        .pipe(connect.reload());
});

gulp.task('typedoc', function() {
    return gulp
        .src('app/typescripts/**/*.ts')
        .pipe(typedoc({
            module: "commonjs",
            target: "es5",
            out: "public/docs/",
            name: "Spotify Connection",
            version: true,
        }));
});

gulp.task('styles', function () {
    return gulp
        .src(path.styles.src)
        .pipe(sourcemaps.init())
        .pipe(autoprefixer({
            browsers: ['last 2 versions'],
            cascade: false
        }))
        .pipe(sass({ 
            outputStyle: 'compressed'
        }))
        .on("error", sass.logError)
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(path.styles.dest))
        .pipe(connect.reload());
});

gulp.task( 'viewsData', function() {

    return gulp
        .src(path.jsons.src)
        .pipe(mergeJsons({fileName: 'combined.json'}))
        .pipe(gulp.dest(path.jsons.dest))
        .pipe(connect.reload());
});

gulp.task( 'views', function() {

    return gulp
        .src( path.views.src )
        .pipe(plumber())
        .pipe( data( function(file) {
            return JSON.parse(
                fs.readFileSync('public/jsons/combined.json')
            );
        } ))
        .pipe( pug( {pretty: false } ))
        .pipe( gulpFilter( path.views.filter ))
        .pipe( gulp.dest( path.views.dest ))
        .pipe( connect.reload() );
});

gulp.task('watch', function () {

    gulp.watch(path.jsons.src, function() {
        runSequence('viewsData', 'views');
    });
    gulp.watch(path.views.src, ['views']);
    gulp.watch(path.styles.src, ['styles']);
    gulp.watch(path.scripts.src, ['scripts']);
    gulp.watch(path.scripts.src, ['typedoc']);
    gulp.watch(path.images.src, ['imagemin']);
    gulp.watch(path.images.src, ['images']);
    //gulp.watch(path.images.src, ['jsons']);
    gulp.watch(path.images.src, ['fonts']);
});

//TODO:
//https://github.com/addyosmani/critical-path-css-demo
gulp.task('default', function(callback) {
  runSequence(
    'clean:public', 'viewsData', [
        'vendor-scripts', 
        'scripts', 
        'styles', 
        'imagemin', 
        'images',
        //'jsons',
        'fonts',
        'views'
    ], 
    'typedoc',
    'webserver',
    'uri', 
    'watch',
    callback);
});