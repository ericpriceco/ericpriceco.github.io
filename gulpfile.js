var gulp = require('gulp');
var uncss = require('gulp-uncss');
var csso = require('gulp-csso');
gulp.task('default', function() {
    gulp.src('stylesheets/app.css')
        .pipe(uncss({
            html: ['http://localhost:4000/', 'http://localhost:4000/blog/', 'http://localhost:4000/blog/shrink-css/', 'http://localhost:4000/blog/create-jekyll-blog-part2/']
        }))
        .pipe(csso())
        .pipe(gulp.dest('out'));
});