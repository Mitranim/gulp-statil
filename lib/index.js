'use strict'

/**
 * Algorithm.
 *
 * 1. Generate a new statil.
 *
 * 2. Buffer files until all of them have been read.
 *
 * 3. While buffering the files, register each of them with the statil,
 *    compiling its contents into a template function. File paths are rebased
 *    to process.cwd() (the directory whence you run gulp) and
 *    options.relativeDir (if provided).
 *
 * 4. When all files have been buffered and compiled, render all templates,
 *    passing options.locals (if provided). Convert each rendered string into a
 *    Buffer and write it to a new virtual file. Pump them back into the stream.
 */

/******************************* Dependencies ********************************/

var _       = require('lodash')
var pt      = require('path')
var Statil  = require('statil')
var through = require('through2')
var File    = require('vinyl')

/********************************* Generator *********************************/

/**
 * Takes a hash of options and creates a stream that buffers the incoming
 * files while compiling the available files until the incoming stream dries up,
 * then renders all templates and pumps the results back into the stream,
 * producing a group of files with rendered contents.
 *
 * Most of the options are passed directly to the statil constructor used
 * internally, but there are two additional options used by this generator:
 *
 * @name relativeDir
 * @type String
 * @description The name of the template directory relative to the current
 * process's working directory. Basically, this prefix will be stripped from
 * template paths for the purpose of $include calls inside templates. For
 * example, if templates are in ./src/templates and your gulpfile is in ./,
 * this value should be ./src/templates.
 *
 * @name locals
 * @type Hash
 * @description A hash table of "locals" (values made available to a template
 * when it's rendered) that will be supplied to each template.
 */
module.exports = function(options) {
  // Make sure options is an object to avoid future checks.
  if (!_.isObject(options)) options = Object.create(null)

  /**
   * Directory relative to which we'll rebase file paths.
   * @type String
   */
  var templateDir = process.cwd();
  if (typeof options.relativeDir === 'string') {
    templateDir = pt.join(templateDir, options.relativeDir)
  }
  // Remove this key from the options.
  delete options.relativeDir

  /**
   * Locals that will be made available to each template.
   * @type Hash
   */
  var locals
  if (_.isObject(options.locals)) {
    locals = options.locals
  }
  // Remove this key from the options.
  delete options.locals

  /**
   * Statil instance used for this stream.
   * @type Statil
   */
  var statil = new Statil(options)

  /**
   * Transform function. Registers the received file with the statil.
   * @type Function
   */
  function transform(file, e, callback) {
    // Ignore an empty file.
    if (file.isNull()) {
      callback()
      return
    }

    // Ignore a directory.
    if (file.isDirectory()) {
      callback()
      return
    }

    // I don't know how to deal with a stream.
    if (file.isStream()) {
      this.emit('error', new Error("I don't know how to deal with a stream"))
      callback()
      return
    }

    // Register the file with the statil.
    try {
      statil.register(file.contents.toString(), file.path, templateDir)
    } catch (err) {
      this.emit('error', err)
      callback()
      return
    }

    callback()
  }

  /**
   * Flush function. Renders all templates and pumps the resulting files back
   * into the stream. The number of files may be different due to omitting
   * metadata files and creating new files via repetition.
   * @type Function
   */
  function flush(callback) {
    // Render each template, passing the locals, if any.
    try {
      var rendered = statil.renderAll(locals)
      // The returned value must be a hash.
      if (!_.isObject(rendered)) {
        throw new Error('unexpected return value from Statil#renderAll: ' + rendered)
      }
    } catch (err) {
      this.emit('error', err)
      callback()
      return
    }

    // For each rendered file, create a new virtual file, write its contents,
    // and push it into the stream.
    _.each(rendered, function(result, path) {
      // Join the path back with process.cwd() (omitting options.relativeDir, if
      // any).
      path = pt.join(process.cwd(), path)

      // Append .html to the path.
      path += '.html'

      // Create a new file and write the result to it.
      var file = new File({
        path: path,
        contents: new Buffer(result)
      })

      // Push it into the stream.
      this.push(file)
    }, this)

    // Signal the readiness.
    callback()
  }

  // Create and return the stream that will buffer and process files.
  return through.obj(transform, flush)

}
