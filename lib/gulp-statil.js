'use strict'

/**
 * Dependencies
 */

const batch = require('statil').batch
const through = require('through2')
const File = require('vinyl')
const PluginError = require('gulp-util').PluginError
const _ = require('lodash')

/**
 * Lib
 */

module.exports = function (options) {
  options = Object(options)
  let files = Object.create(null)

  return through.obj(
    function transform (file, __, done) {
      if (file.isBuffer()) files[file.relative] = file
      done(null)
    },

    function flush (done) {
      files = _.mapValues(files, file => file.contents.toString())
      let result

      try {
        result = batch(files, options)
        if (!result) {
          done(new PluginError('gulp-statil', 'unexpected return value from statil: ' + result, {showProperties: false}))
          return
        }
      } catch (err) {
        done(new PluginError('gulp-statil', err, {showProperties: false}))
        return
      }

      for (const path in result) {
        this.push(new File({
          path,
          contents: new Buffer(result[path])
        }))
      }

      done(null)
    }
  )
}
