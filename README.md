# Backpressured Transform

A lib for automatically handling backpressure in NodeJS Transforms.

Example usage:

```js
new BackpressureTransform({
  highWaterMark: 42,
  transform: (chunk, encoding) => chunk + chunk,
  flush: () => 'end'
})
```

The transform exposes the same `Transform` options that NodeJS provides besides `transform()` and `flush()`. These functions in `BackpressureTransform` return the transformed data and the `BackpressureTransform` handles when to execute the `Transform` callback to signal more data can be processed.
