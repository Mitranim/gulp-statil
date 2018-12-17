'use strict'

/**
 * Dependencies
 */

const {Transform} = require('stream')
const File = require('vinyl')
const PluginError = require('plugin-error')
const {isFunction} = require('util')

/**
 * Lib
 */

exports.withBufferedContents = withBufferedContents
function withBufferedContents(fun) {
  if (!isFunction(fun)) {
    throw new PluginError('gulp-statil', `Expected a transform function, got ${fun}`, {showProperties: false})
  }
  return withBufferedFiles(function runWithBufferedContents(files) {
    return fun(mapVals(files, contentsToString))
  })
}

exports.withBufferedFiles = withBufferedFiles
function withBufferedFiles(fun) {
  if (!isFunction(fun)) {
    throw new PluginError('gulp-statil', `Expected a transform function, got ${fun}`, {showProperties: false})
  }

  const files = Object.create(null)

  return new Transform({
    objectMode: true,

    transform(file, __, done) {
      if (file.isBuffer()) files[file.relative] = file
      done()
    },

    flush(done) {
      const result = fun(files)

      if (!isObject(result)) {
        done(new PluginError('gulp-statil', `Expected the transform function to return an object, got ${result}`, {showProperties: false}))
        return
      }

      for (const path in result) {
        this.push(new File({
          path,
          contents: Buffer.from(result[path])
        }))
      }

      done()
    }
  })
}

function contentsToString(file) {
  return file.contents.toString()
}

function mapVals(value, fun) {
  const out = {}
  for (const key in value) out[key] = fun(value[key], key)
  return out
}

function isObject(value) {
  return value != null && typeof value !== 'object'
}
