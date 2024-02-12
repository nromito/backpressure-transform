import { randomBytes } from "node:crypto";
import { PassThrough, Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { before, describe, it } from "node:test";
import { BackpressuredTransform } from ".";
import { createReadStream } from "node:fs";
import { join } from "node:path";
import assert from "node:assert";
import { createGunzip } from "node:zlib";

const Benchmark = require('benchmark');

describe.skip('micro', () => {
  it('buffer', async () => {
    const buf: string[] = [];
    for (let i = 0; i < 100; i++) {
      buf.push(JSON.stringify({time: Date.now(), iteration: `${i}`, random: randomBytes(128).toString()}));
    }
    const readableStr = buf.join('\n');
    const suite = new Benchmark.Suite
    await new Promise<void>(resolve => {
      suite
      .add('builtin passthru', async () => {
        await pipeline(
          Readable.from(readableStr),
          new PassThrough().on('data', () => {}) // throw it out
        )
      })
      .add('backpressure passthru', async () => {
        await pipeline(
          Readable.from(readableStr),
          new BackpressuredTransform().on('data', () => {}) // throw it out
        )
      })
      .on('cycle', (event: any) => {
        console.log(String(event.target))
      })
      .on('complete', () => {
        resolve()
      })
      .run({async: true})
    })

  })
  it('obj', async () => {
    const buf: any[] = [];
    for (let i = 0; i < 100; i++) {
      buf.push({time: Date.now(), iteration: `${i}`});
    }
    const suite = new Benchmark.Suite
    await new Promise<void>(resolve => {
      suite
      .add('builtin passthru', async () => {
        const t = new PassThrough({objectMode: true}).on('data', () => {});
        const p = new Promise<void>(resolve => {
          t.once('finish', () => resolve())
        })
        for (let i = 0; i < buf.length; i++) {
          if (!t.write(buf[i])) {
            await new Promise<void>(resolve => t.once('drain', () => resolve()))
          }
        }
        t.end();
        await p;
      })
      .add('backpressure passthru', async () => {
        const t = new BackpressuredTransform({objectMode: true}).on('data', () => {})
        const p = new Promise<void>(resolve => {
          t.once('finish', () => resolve())
        })
        for (let i = 0; i < buf.length; i++) {
          if (!t.write(buf[i])) {
            await new Promise<void>(resolve => t.once('drain', () => resolve()))
          }
        }
        t.end();
        await p;
      })
      .on('cycle', (event: any) => {
        console.log(String(event.target))
      })
      .on('complete', () => {
        resolve();
      })
      .run({async: true})
    })

  })
})

describe('system perf', () => {
  it('should test buffer mode', async () => {
    const backpressuredStart = Date.now();
    await pipeline(
      createReadStream(join(process.cwd(), 'data', 'syslog.log.gz')),
      createGunzip(),
      new BackpressuredTransform().on('data', () => {})
    );
    const backpressuredElapsed = Date.now() - backpressuredStart;

    const passthruStart = Date.now();
    await pipeline(
      createReadStream(join(process.cwd(), 'data', 'syslog.log.gz')),
      createGunzip(),
      new PassThrough().on('data', () => {})
    );
    const passthruElapsed = Date.now() - passthruStart;
    console.log('results', {backpressuredElapsed, passthruElapsed})
    const marginOfError = Math.max(passthruElapsed, backpressuredElapsed)*0.05;
    assert(Math.abs(passthruElapsed - backpressuredElapsed) < marginOfError)
  })

  it('should test object mode', async () => {
    const backpressuredStart = Date.now();
    await pipeline(
      createReadStream(join(process.cwd(), 'data', 'syslog.log.gz')),
      createGunzip(),
      new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          callback(null, {raw: chunk});
        }
      }),
      new BackpressuredTransform({objectMode: true}).on('data', () => {})
    );
    const backpressuredElapsed = Date.now() - backpressuredStart;

    const passthruStart = Date.now();
    await pipeline(
      createReadStream(join(process.cwd(), 'data', 'syslog.log.gz')),
      createGunzip(),
      new Transform({
        objectMode: true,
        transform(chunk, encoding, callback) {
          callback(null, {raw: chunk});
        }
      }),
      new PassThrough({objectMode: true}).on('data', () => {})
    );
    const passthruElapsed = Date.now() - passthruStart;
    console.log('results', {backpressuredElapsed, passthruElapsed})
    const marginOfError = Math.max(passthruElapsed, backpressuredElapsed)*0.05;
    assert(Math.abs(passthruElapsed - backpressuredElapsed) < marginOfError)
  })
})