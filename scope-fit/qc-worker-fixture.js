// Browser test control only; never imported by the application.
(() => {
  const NativeWorker = window.Worker;
  window.__qcWorkers = []; window.__qcNativeWorkers = [];
  window.__qcActualStop = worker => NativeWorker.prototype.terminate.call(worker);
  window.Worker = class extends NativeWorker {
    constructor(...args) {
      super(...args); this.__qcStopped = false;
      this.__qcTrace = { ticks: 0, stops: 0, gated: false, released: false };
      window.__qcWorkers.push(this.__qcTrace); window.__qcNativeWorkers.push(this);
      this.addEventListener('message', event => {
        if (event.data?.__qcTrace) { this.__qcTrace.ticks++; event.stopImmediatePropagation(); }
      });
    }
    postMessage(request, ...args) {
      if (!request?.file || typeof window.__processingTextControl !== 'function') return super.postMessage(request, ...args);
      this.__qcTrace.gated = true;
      super.postMessage({ ...request, __qcGate: true }, ...args);
      Promise.resolve().then(() => window.__processingTextControl.call(request.file)).then(value => {
        if (this.__qcStopped) return;
        this.__qcTrace.released = true;
        super.postMessage({ __qcRelease: true, value });
      }, () => {
        if (this.__qcStopped) return;
        this.__qcTrace.released = true;
        super.postMessage({ __qcRelease: true, reject: true });
      });
    }
    terminate() {
      if (window.__qcFailTermination) throw Error('controlled native termination rejection');
      const result = super.terminate();
      this.__qcStopped = true; this.__qcTrace.stops++;
      return result;
    }
  };
})();
