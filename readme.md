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
    .pipe(...)
    .pipe($.statil({stripPrefix: <templatesDir>}))
    .pipe(...)
    .pipe(gulp.dest(...))
})
```

To run tests, clone the repo, `cd` to its directory, run `npm i`, and use:

```shell
npm test
```

To watch files and rerun tests when tinkering with the source, use:

```shell
npm run autotest
```

## ToDo / WIP

Include an options reference.
