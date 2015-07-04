var gulp = require('gulp');
var uncss = require('gulp-uncss');
var csso = require('gulp-csso');
gulp.task('default', function() {
    gulp.src('stylesheets/app.css')
        .pipe(uncss({
            html: ['_site/index.html', '_site/blog/index.html', '_/site/blog/**/*.html']
        }))
        .pipe(csso())
        .pipe(gulp.dest('./out'));
});