import { Transform, TransformCallback, TransformOptions } from "stream";

export interface ITransformOpts extends Exclude<TransformOptions, 'transform'> {
  transform?: (chunk: any, encoding: BufferEncoding) => any[];
}
export class BackpressuredTransform extends Transform {
  private transformImpl: (chunk: any, encoding: BufferEncoding) => any[];
  private buf: any[] = [];
  constructor(opts?: ITransformOpts) {
    super(opts);
    this.transformImpl = opts?.transform ?? ((chunk, enc) => [chunk])
  }
  _transform(chunk: any, encoding: BufferEncoding, callback: TransformCallback): void {
    this.buf.push(this.transformImpl(chunk, encoding));
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
}