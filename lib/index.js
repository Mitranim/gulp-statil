'use strict';

/******************************* Dependencies ********************************/

var pt      = require('path');
var Statil  = require('statil').Statil;
var through = require('through2');
var File    = require('vinyl');

/********************************* Generator *********************************/

/**
 * # options.locals <any>
 * A hash table of "locals" (values made available to a template
 * when it's rendered) that will be supplied to each template.
 *
 * Other options are passed to statil.
 */
module.exports = function(options) {
  options = options || {};

  // Option 'locals'.
  var locals = options.locals;
  delete options.locals;

  // Statil instance used for this stream.
  var statil = new Statil(options);

  // Registers the received file with the statil.
  function transform(file, e, done) {
    if (file.isBuffer()) {
      try {
        statil.register(file.contents.toString(), file.relative);
      } catch (err) {
        done(err);
      }
    }
    done(null);
  }

  // Renders all templates and pumps the resulting files back into the stream.
  // The number of files may be different due to omitting metadata files and
  // creating new files via repetition.
  function flush(done) {
    // Render each template, passing the locals, if any.
    try {
      var rendered = statil.render(locals);
      // The returned value must be a hash.
      if (rendered == null || typeof rendered !== 'object') {
        throw new Error('unexpected return value from Statil#render: ' + rendered);
      }
    } catch (err) {
      done(err);
      return;
    }

    // For each rendered file, create a new virtual file, write its contents,
    // and push it into the stream.
    for (var path in rendered) {
      this.push(new File({
        path: path + '.html',
        contents: new Buffer(rendered[path])
      }));
    }

    done(null);
  }

  return through.obj(transform, flush);
}
