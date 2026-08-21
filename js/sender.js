window.QrTransfer = window.QrTransfer || {};

QrTransfer.createSender = () => {
  const IDLE_MESSAGE = "Choose file to get started";
  const sender_message = document.getElementById("sender_message");
  const transfer_btn = document.getElementById("transfer_btn");
  let is_transferring = false;
  let transfer_generation = 0;
  let qrcode_object = null;
  let qrcode_ready = false;

  const reset_qrcode = () => {
    if (!qrcode_object) return;
    qrcode_object.clear();
    qrcode_object.makeCode(IDLE_MESSAGE);
  };

  const stop = () => {
    is_transferring = false;
    transfer_generation += 1;
    transfer_btn.textContent = "Start Transfer";
    sender_message.textContent = IDLE_MESSAGE;
    reset_qrcode();
  };

  const start = async () => {
    let file_input = document.getElementById("file_input");
    if (!file_input.files[0]) {
      sender_message.textContent = IDLE_MESSAGE;
      return;
    }
    const generation = ++transfer_generation;
    is_transferring = true;
    transfer_btn.textContent = "Stop Transfer";
    let file = file_input.files[0];
    let data_array = pako.gzip(await file.arrayBuffer(), { level: 9 });
    if (generation !== transfer_generation) return;
    let total_chunks = Math.ceil(data_array.length / QrTransfer.CHUNK_SIZE);
    let metadata = { name: file.name, chunks: total_chunks };
    qrcode_object.clear();
    qrcode_object.makeCode(JSON.stringify(metadata));
    sender_message.textContent = "Starting data transfer in few seconds ...";
    await new Promise((r) => setTimeout(r, 1000));
    if (generation !== transfer_generation) return;
    for (let i = 0; i < total_chunks; i++) {
      await new Promise((r) => setTimeout(r, 50));
      if (generation !== transfer_generation) return;
      let start_offset = i * QrTransfer.CHUNK_SIZE;
      let chunk = data_array.subarray(
        start_offset,
        start_offset + QrTransfer.CHUNK_SIZE
      );
      let encoded_data = QrTransfer.encodeData(i, chunk);
      qrcode_object.clear();
      qrcode_object.makeCode(encoded_data);
      sender_message.textContent = `Transfering Chunk ${i}/${total_chunks} ...`;
    }
    if (generation === transfer_generation) {
      stop();
    }
  };

  const ensureReady = () => {
    if (qrcode_ready) return;
    let lowest_size = Math.min(window.innerWidth, window.innerHeight) / 1.5;
    qrcode_object = new QRCode("qrcode", {
      text: IDLE_MESSAGE,
      width: lowest_size,
      height: lowest_size,
      typeNumber: 40,
      colorDark: "#000000",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
    qrcode_ready = true;
  };

  const bind = () => {
    transfer_btn.addEventListener("click", () => {
      if (is_transferring) stop();
      else start();
    });
  };

  return {
    bind,
    stop,
    ensureReady,
    isActive: () => is_transferring,
  };
};
