'use strict'

/**
 * Dependencies
 */

const _ = require('lodash')
const pt = require('path')
const gulpStatil = require(process.cwd())

/**
 * Test
 */

const options = {
  ignorePath: path => path === 'html/third.html',
  imports: {secret: 'something special'},
}

const stream = gulpStatil(options)

for (const file of files()) stream._transform(file, null, _.noop)

let err = Error()

stream._flush(value => {
  err = value
})

if (err !== null) throw Error()

const bufferFiles = flatBufferData(stream._readableState.buffer.head)

const paths = _.sortBy(_.map(bufferFiles, 'relative'))
const expectedPaths = ['html/first.html', 'html/second.html']

if (!_.isEqual(paths, expectedPaths)) throw Error()

const contents = _.sortBy(_.invokeMap(_.map(bufferFiles, 'contents'), 'toString'))
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

function flatBufferData ({data, next}) {
  return [...(data ? [data] : []), ...(next ? flatBufferData(next) : [])]
}

/**
 * Done
 */

console.log(`[${pad(new Date().getHours())}:${pad(new Date().getMinutes())}:${pad(new Date().getSeconds())}] Finished test without errors.`)

function pad (val) {
  return _.padStart(val, 2, '0')
}
