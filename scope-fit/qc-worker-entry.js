// Native Worker test gate; served only by explicit browser route fixtures.
const __qcProductHandler = self.onmessage;
let __qcRequest = null, __qcTimer = null;
self.onmessage = event => {
  if (event.data?.__qcGate) {
    const { __qcGate, ...request } = event.data; __qcRequest = request;
    __qcTimer = setInterval(() => self.postMessage({ __qcTrace: true }), 10);
    return;
  }
  if (event.data?.__qcRelease) {
    clearInterval(__qcTimer);
    const control = event.data;
    File.prototype.text = async function () {
      if (control.reject) throw Error('controlled native worker read rejection');
      return control.value;
    };
    return __qcProductHandler({ data: __qcRequest });
  }
  return __qcProductHandler(event);
};
