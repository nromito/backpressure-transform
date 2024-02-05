import { Transform, TransformCallback, TransformOptions } from "stream";

export interface ITransformOpts extends Exclude<TransformOptions, 'transform' | 'flush'> {
  transform?: (chunk: any, encoding: BufferEncoding) => any[];
  flush?: () => any[];
}
export class BackpressuredTransform extends Transform {
  private transformImpl: (chunk: any, encoding: BufferEncoding) => any[];
  private flushImpl: () => any[]
  private buf: any[] = [];
  constructor(opts?: ITransformOpts) {
    super({...opts, transform: undefined, flush: undefined});
    this.transformImpl = opts?.transform ?? ((chunk, enc) => [chunk])
    this.flushImpl = opts?.flush ?? (() => []);
  }
  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
    this.buf.push.apply(this.buf, this.transformImpl(chunk, encoding));
    this.flushBuf(callback);
  }
  private flushBuf(callback: TransformCallback): void {
    const buf = this.buf;
    this.buf = [];
    for (let i = 0; i < buf.length; i++) {
      if (this.push(buf[i])) continue;
      if (i === buf.length - 1) {
        return callback();
      }
      this.buf = this.buf.slice(i+1);
      this.once('data', () => {
        this.flushBuf(callback)
      })
      return;
    }
    callback();
  }
  _flush(callback: TransformCallback): void {
    this.buf.push.apply(this.buf, this.flushImpl())
    this.flushBuf(callback);
  }
}