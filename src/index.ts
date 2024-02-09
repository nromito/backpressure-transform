import { Transform, TransformCallback, TransformOptions } from "stream";

export interface ITransformOpts extends Exclude<TransformOptions, 'transform' | 'flush'> {
  transform?: (chunk: Buffer | string | any, encoding: BufferEncoding) => Buffer | string | any;
  flush?: () => Buffer | string | any;
}
export class BackpressuredTransform extends Transform {
  private transformImpl: (chunk: Buffer | string | any, encoding: BufferEncoding) => Buffer | string | any;
  private flushImpl?: () => Buffer | string | any;
  private flushBuf: (buf: any, callback: TransformCallback) => void;
  constructor(opts?: ITransformOpts) {
    super({...opts, transform: undefined, flush: undefined});
    this.transformImpl = opts?.transform ?? ((chunk, enc) => chunk)
    this.flushImpl = opts?.flush
    this.flushBuf = opts?.objectMode ? this.flushBufObjectMode : this.flushBufBufferMode;
  }
  _transform(chunk: Buffer | string | any, encoding: BufferEncoding, callback: TransformCallback): void {
    this.flushBuf(this.transformImpl(chunk, encoding), callback);
  }
  private flushBufObjectMode(buf: any, callback: TransformCallback): void {
    if (!Array.isArray(buf)) {
      if (!this.push(buf)) {
        this.once('data', () => callback());
        return;
      }
      return callback();
    }
    // handle array
    for (let i = 0; i < buf.length; i++) {
      if (this.push(buf[i])) continue;
      if (i === buf.length - 1) {
        return callback();
      }
      this.once('data', () => {
        this.flushBuf(buf.slice(i+1), callback)
      })
      return;
    }
    callback();
  }
  private flushBufBufferMode(buf: Buffer | string, callback: TransformCallback): void {
    if (!this.push(buf)) {
      this.once('data', () => callback());
      return;
    }
    callback();
  }
  _flush(callback: TransformCallback): void {
    if (this.flushImpl) return this.flushBuf(this.flushImpl(), callback)
    callback();
  }
}