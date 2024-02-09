import { Readable, Writable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { describe, it } from "node:test";
import { BackpressuredTransform } from ".";
import * as assert from 'assert'

describe('BackpressuredTransform - object mode', async () => {
  it('should passthru', async () => {
    const data: any[] = [];
    await assert.doesNotReject(pipeline(
      Readable.from([0,1,2,3,4,5]),
      new BackpressuredTransform({objectMode: true, highWaterMark: 1})
        .on('data', chunk => {
          data.push(chunk)
        })
    ));
    assert.deepEqual(data.flat(), [0,1,2,3,4,5])
  });
  it('should take custom funcs', async () => {
    const data: any[] = [];
    await assert.doesNotReject(pipeline(
      Readable.from([0,1,2,3,4,5]),
      new BackpressuredTransform({
        objectMode: true, 
        highWaterMark: 1,
        transform: (chunk, encoding) => [chunk, chunk],
        flush: () => ['end']
      }).on('data', chunk => {
          data.push(chunk)
        })
    ));
    assert.deepEqual(data.flat(), [0,0,1,1,2,2,3,3,4,4,5,5, 'end'])
  })
  it('should actually backpressure', async () => {
    const data: any[] = [];
    let resolve: any;
    const p = new Promise(r => {
      resolve = r;
    }) 
    const w = new Writable({
      objectMode: true,
      highWaterMark: 1,
      write(chunk, encoding, callback) {
        data.push(chunk);
        resolve();
      },
    })
    const t = new BackpressuredTransform({
      objectMode: true, 
      highWaterMark: 1,
      transform: (chunk, encoding) => [chunk, chunk],
      flush: () => ['end']
    });
    pipeline(
      Readable.from([0,1,2,3,4,5]),
      t,
      w
    );
    await p;
    assert.deepEqual(data.flat(), [0])
    assert.deepEqual(t.readableLength, 1)
  })
})

describe('BackpressuredTransform - buffer mode', async () => {
  it('should passthru', async () => {
    const data: any[] = [];
    await assert.doesNotReject(pipeline(
      Readable.from('foobar'),
      new BackpressuredTransform({highWaterMark: 1})
        .on('data', chunk => {
          data.push(chunk)
        })
    ));
    assert.deepEqual(data.flat().join(''), 'foobar')
  });
  it('should take custom funcs', async () => {
    const data: any[] = [];
    await assert.doesNotReject(pipeline(
      Readable.from('foobar'),
      new BackpressuredTransform({
        highWaterMark: 1,
        transform: (chunk, encoding) => chunk + chunk,
        flush: () => 'end'
      }).on('data', chunk => {
          data.push(chunk)
        })
    ));
    assert.deepEqual(data.flat().join(''), 'foobarfoobarend')
  })
  it('should actually backpressure', async () => {
    const data: any[] = [];
    let resolve: any;
    const p = new Promise(r => {
      resolve = r;
    }) 
    const w = new Writable({
      highWaterMark: 1,
      write(chunk, encoding, callback) {
        data.push(chunk);
        resolve();
      },
    })
    const t = new BackpressuredTransform({
      highWaterMark: 1,
      transform: (chunk, encoding) => chunk + chunk,
      flush: () => 'end'
    });
    pipeline(
      Readable.from('foobar'),
      t,
      w
    );
    await p;
    assert.deepEqual(data.flat().join(''), 'foobarfoobar')
    assert.deepEqual(t.readableLength, 3) // has "end" in the buffer
  })
})