class Mutex {
  constructor() {
    this._promise = Promise.resolve();
  }

  run(fn) {
    const result = this._promise.then(() => fn());
    this._promise = result.then(() => {}, () => {});
    return result;
  }
}

module.exports = Mutex;
