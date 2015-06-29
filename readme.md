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
var statil = require('gulp-statil');

gulp.task('templates', function() {
  return gulp.src('src/html/**/*')
    .pipe(statil(/* statil options */))
    .pipe(gulp.dest('dist'))
})
```

## Options

The options are passed directly to `statil`, and one additional option is
available.

### `options.locals`

Passed into the `Statil#render` call when rendering all templates.
