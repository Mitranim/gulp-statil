## Description

This is a [`gulp`](http://gulpjs.com) plugin for
[`Statil`](https://github.com/mitranim/statil), a lightweight templating utility.

Contrary to its name, this plugin doesn't actually use Statil. It simply provides a file buffering utility, which allows you to use Statil directly.

## Installation and Usage

```sh
npm i gulp-statil
```

In your `gulpfile.js`:

```js
const {withBufferedContents} = require('gulp-statil')
const {createSettings, renderSettings} = require('statil')

gulp.task('templates', () => (
  gulp.src('src/html/**/*')
    .pipe(withBufferedContents(templates => (
      renderSettings(createSettings(templates, {}))
    )))
    .pipe(gulp.dest('dist'))
))
```
