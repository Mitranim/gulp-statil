## Description

This is a [`gulp`](http://gulpjs.com) plugin for
[`statil`](https://github.com/Mitranim/statil), the most lightweight static site
generator you've ever seen. It helps you integrate statil with your build chain,
rebuilding your site on the fly as you edit.

## Installation and Usage

In a shell:

```shell
npm i --save-dev gulp-statil
```

In your `gulpfile.js`:

```javascript
var $ = require('gulp-load-plugins')() // if you're not using this, start now

gulp.task('templates', function() {
  return gulp.src(<templatesDir> + '/**/*')
    .pipe(<any filter or transform>)
    .pipe($.statil({relativeDir: <templatesDir>})) // relativeDir is required
    .pipe(<any filter or transform>)
    .pipe(gulp.dest(<destinationDir>))
})
```

## ToDo / WIP

Include a full API reference.
Write tests.
