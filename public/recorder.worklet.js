class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buffer = [];
    this._bufferSize = 0;
    this.port.onmessage = (event) => {
      if (event.data.command === 'clear') {
        this.clearBuffer();
      }
      if (event.data.command === 'getBuffer') {
        this.sendBuffer();
      }
    };
  }

  process(inputs) {
    const input = inputs[0];
    if (input.length > 0) {
      const channelData = input[0];
      const newBuffer = new Float32Array(channelData);
      this._buffer.push(newBuffer);
      this._bufferSize += newBuffer.length;
    }
    return true;
  }

  clearBuffer() {
    this._buffer = [];
    this._bufferSize = 0;
  }

  sendBuffer() {
    const concatenatedBuffer = new Float32Array(this._bufferSize);
    let offset = 0;
    for (const buffer of this._buffer) {
      concatenatedBuffer.set(buffer, offset);
      offset += buffer.length;
    }
    this.port.postMessage({ buffer: concatenatedBuffer });
    this.clearBuffer();
  }
}

registerProcessor('recorder-processor', RecorderProcessor);
