'use strict'

/**
 * Dependencies
 */

const _ = require('lodash')
const pt = require('path')
const gulpStatil = require('../lib/gulp-statil')

/**
 * Test
 */

const options = {data: {secret: 'something special'}, ignorePaths: ['html/third.html']}

const stream = gulpStatil(options)

for (const file of files()) stream._transform(file, null, _.noop)

let err = Error()

stream._flush(value => {
  err = value
})

if (err !== null) throw Error()

const buffer = stream._readableState.buffer

const paths = _.sortBy(_.map(buffer, 'relative'))
const expectedPaths = ['html/first.html', 'html/second.html']

if (!_.isEqual(paths, expectedPaths)) throw Error()

const contents = _.sortBy(_.invoke(_.map(buffer, 'contents'), 'toString'))
const expectedContents = [
  'first something special',
  'second something special'
]

if (!_.isEqual(contents, expectedContents)) throw Error()

/**
 * Utils
 */

function mockFile () {
  return {
    isNull: () => false,
    isStream: () => false,
    isDirectory: () => false,
    isBuffer: () => true,
    clone () { return _.clone(this) }
  }
}

// Mock template files.
function files () {
  return [
    _.assign(mockFile(), {
      contents: new Buffer('first {{secret}}'),
      path: pt.join(process.cwd(), 'html/first.html'),
      relative: 'html/first.html'
    }),
    _.assign(mockFile(), {
      contents: new Buffer('second {{secret}}'),
      path: pt.join(process.cwd(), 'html/second.html'),
      relative: 'html/second.html'
    }),
    _.assign(mockFile(), {
      contents: new Buffer('third {{secret}}'),
      path: pt.join(process.cwd(), 'html/third.html'),
      relative: 'html/third.html'
    })
  ]
}

/**
 * Done
 */

console.log(`[${pad(new Date().getHours())}:${pad(new Date().getMinutes())}:${pad(new Date().getSeconds())}] Finished test without errors.`)

function pad (val) {
  return _.padLeft(val, 2, '0')
}
