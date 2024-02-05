import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { describe, it } from "node:test";
import { BackpressuredTransform } from ".";
import * as assert from 'assert'

describe('BackpressuredTransform', async () => {
  it('should not lose data', async () => {
    const data: any[] = [];
    await assert.doesNotReject(pipeline(
      Readable.from([0,1,2,3,4,5]),
      new BackpressuredTransform({objectMode: true})
        .on('data', chunk => {
          data.push(chunk)
        })
    ));
    assert.deepEqual(data.flat(), [0,1,2,3,4,5])
  })
})