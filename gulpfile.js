const autoprefixer    = require('gulp-autoprefixer');
const cache           = require('gulp-cache');
const concat          = require('gulp-concat');
const connect         = require('gulp-connect');
const data            = require('gulp-data');
const debug           = require('gulp-debug');
const del             = require('del');
const fs              = require('fs');
const gulp            = require('gulp');
const gulpFilter      = require('gulp-filter');
const gutil           = require('gulp-util');
const imagemin        = require('gulp-imagemin');
const pug             = require('gulp-pug');
const jsonminify      = require('gulp-json-minify');
const lazypipe        = require('lazypipe');
const mainBowerFiles  = require('gulp-main-bower-files');
const merge           = require('merge2');
const mergeJsons      = require('gulp-merge-json');
const open            = require('gulp-open');
const plumber         = require('gulp-plumber');
const rename          = require('gulp-rename');
const runSequence     = require('run-sequence');
const sass            = require('gulp-sass');
const sourcemaps      = require('gulp-sourcemaps');
const ts              = require('gulp-typescript');
const typedoc         = require("gulp-typedoc");
const uglify          = require('gulp-uglify');

const path = {
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

gulp.task( 'webserver', () => {
    connect.server({
        root: 'public',
        livereload: true,
        directoryListing: true
    });
});

gulp.task( 'uri', () => {
    gulp
    .src(__filename)
    .pipe( open({uri: 'http://localhost:8080'}));
});

gulp.task( 'clean:public', () => {
    
    return del.sync('public');
});

gulp.task( 'fonts', () => {
    
    return gulp
        .src(path.fonts.src)
        .pipe(gulp.dest(path.fonts.dest))
        .pipe(connect.reload());
});

gulp.task('jsons', () => {
    
    return gulp
        .src(path.jsons.src)
        .pipe(plumber())
        .pipe(jsonminify())
        .pipe(gulp.dest(path.jsons.dest))
        .on('error', gutil.log)
        .pipe(connect.reload());
});

gulp.task('imagemin', () => {
    return gulp
        .src(path.images.src)
        .pipe(imagemin())
        .pipe(gulp.dest(path.images.dest))
        .pipe(connect.reload());
});

gulp.task('images', () => {
  return gulp
      .src(path.images.src)
      // Caching images that ran through imagemin
      .pipe(cache(imagemin({interlaced: true}) ))
      .pipe(gulp.dest(path.images.dest))
});

gulp.task('vendor-scripts', () => {

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

gulp.task('scripts', () => {
    return gulp
        .src(path.scripts.src)
        .pipe(sourcemaps.init())
        .pipe(ts({
                target: "ES5",
            	out: path.scripts.out,
                module: 'amd'
    	    }
        ))
        .pipe(uglify())
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(path.scripts.dest))
        .pipe(connect.reload());
});

gulp.task('typedoc', () => {

    return gulp
        .src('app/typescripts/**/*.ts')
        .pipe(tsConfig())
        .pipe(typedoc({
            module: "commonjs",
            target: "es5",
            out: "public/docs/",
            name: "Spotify Connection",
            version: true,
        }));
});

gulp.task('styles', () => {
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
        .on( 'error', sass.logError )
        .pipe(sourcemaps.write('.'))
        .pipe(gulp.dest(path.styles.dest))
        .pipe(connect.reload());
});

gulp.task( 'viewsData', () => {

    return gulp
        .src(path.jsons.src)
        .pipe(mergeJsons({fileName: 'combined.json'}))
        .pipe(gulp.dest(path.jsons.dest))
        .pipe(connect.reload());
});

gulp.task( 'views', () => {

    return gulp
        .src( path.views.src )
        .pipe(plumber())
        .pipe( data( (file) => {
            return JSON.parse(
                fs.readFileSync('public/jsons/combined.json')
            );
        } ))
        .pipe( pug( {pretty: false } ))
        .pipe( gulpFilter( path.views.filter ))
        .pipe( gulp.dest( path.views.dest ))
        .pipe( connect.reload() );
});

gulp.task('watch', () => {

    gulp.watch(path.jsons.src, () => {
        runSequence('viewsData', 'views');
    });
    gulp.watch(path.views.src, ['views']);
    gulp.watch(path.styles.src, ['styles']);
    gulp.watch(path.scripts.src, ['scripts']);
    //gulp.watch(path.scripts.src, ['typedoc']);
    gulp.watch(path.images.src, ['imagemin']);
    gulp.watch(path.images.src, ['images']);
    //gulp.watch(path.images.src, ['jsons']);
    gulp.watch(path.images.src, ['fonts']);
});

//TODO:
//https://github.com/addyosmani/critical-path-css-demo
gulp.task('default', (callback) => {
  runSequence(
    'clean:public', 'viewsData', [
        'vendor-scripts', 
        'scripts', 
        'styles', 
        'imagemin', 
        'images',
        'fonts',
        'views'
    ], 
    //'typedoc',
    'webserver',
    'uri', 
    'watch',
    callback);
});