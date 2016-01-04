[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](http://standardjs.com)

## Description

This is a [`gulp`](http://gulpjs.com) plugin for
[`statil`](https://github.com/Mitranim/statil), a lightweight HTML generator.

## Installation and Usage

In a shell:

```shell
npm i --save-dev gulp-statil
```

In your `gulpfile.js`:

```javascript
const statil = require('gulp-statil')

gulp.task('templates', () => (
  gulp.src('src/html/**/*')
    .pipe(statil(/* options */))
    .pipe(gulp.dest('dist'))
))
```

## Options

`options` are passed directly to statil.
