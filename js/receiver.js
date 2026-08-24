window.QrTransfer = window.QrTransfer || {};

QrTransfer.createReceiver = () => {
  const IDLE_MESSAGE = "Click receive button to start receiving";
  const receiver_message = document.getElementById("receiver_message");
  const progress = document.getElementById("progress");
  const receiver_btn = document.getElementById("receiver_btn");
  let decoded_chunks = {};
  let file_metadata = {};
  let is_receiving = false;
  let canvas, context, videoElement;
  let camera_ready = false;
  let camera_stream = null;
  let camera_generation = 0;

  const download_file = (data, fileName, fileType) => {
    const blob = fileType
      ? new Blob([data], { type: fileType })
      : new Blob([data]);
    const dummy_element = document.createElement("a");
    const url = URL.createObjectURL(blob);
    dummy_element.href = url;
    dummy_element.download = fileName;
    dummy_element.click();
    URL.revokeObjectURL(url);
  };

  const update_progress = () => {
    progress.textContent = `Progress: ${Object.keys(decoded_chunks).length} / ${
      file_metadata.chunks || 0
    }`;
  };

  const parse_metadata = (decoded_data) => {
    try {
      const parsed = JSON.parse(decoded_data);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof parsed.name === "string" &&
        typeof parsed.chunks === "number" &&
        (typeof parsed.type === "string" || parsed.type === undefined)
      ) {
        return parsed;
      }
    } catch (error) {
      // Not metadata JSON.
    }
    return null;
  };

  const stop = () => {
    is_receiving = false;
    receiver_btn.textContent = "Start Receiver";
    decoded_chunks = {};
    file_metadata = {};
    update_progress();
    receiver_message.textContent = IDLE_MESSAGE;
  };

  const start = async () => {
    if (!camera_ready) {
      receiver_message.textContent = "Camera is not ready yet ...";
      return;
    }
    decoded_chunks = {};
    file_metadata = {};
    is_receiving = true;
    receiver_btn.textContent = "Stop Receiver";
    update_progress();
    while (file_metadata.chunks != Object.keys(decoded_chunks).length) {
      try {
        await new Promise((r) => setTimeout(r, 10));
        context.drawImage(videoElement, 0, 0);
        const image_data = context.getImageData(
          0,
          0,
          canvas.width,
          canvas.height
        );
        let symbols = await zbarWasm.scanImageData(image_data);
        if (!symbols || !symbols.length) {
          continue;
        }
        let decoded_data = symbols[0].decode();
        const metadata = parse_metadata(decoded_data);
        if (metadata) {
          file_metadata = metadata;
          decoded_chunks = {};
          receiver_message.textContent = `Transferring file: ${file_metadata.name}`;
          update_progress();
        } else if (decoded_data.split(",").length == 2) {
          let raw_data = QrTransfer.decodeData(decoded_data);
          decoded_chunks[raw_data["index"]] = raw_data["data"];
          update_progress();
        }
        window.decoded_chunks = decoded_chunks;
      } catch (error) {
        console.error("Error in Loop: ", error);
      }
      if (!is_receiving) {
        file_metadata = {};
        decoded_chunks = {};
        update_progress();
        receiver_message.textContent = IDLE_MESSAGE;
        return true;
      }
    }
    receiver_message.textContent = "Data Transfer Complete";
    let output_array = [];
    for (let i = 0; i < file_metadata.chunks; i++) {
      output_array = output_array.concat(decoded_chunks[i]);
    }
    let output_unit8array = Uint8Array.from(output_array);
    window.output_unit8array = output_unit8array;
    let infalted_array = pako.inflate(window.output_unit8array);
    download_file(infalted_array, file_metadata.name, file_metadata.type);
    stop();
  };

  const release_stream = (stream) => {
    if (!stream) return;
    stream.getTracks().forEach((track) => track.stop());
  };

  const stopCamera = () => {
    camera_generation += 1;
    camera_ready = false;
    release_stream(camera_stream);
    camera_stream = null;
    if (videoElement) {
      videoElement.srcObject = null;
    }
  };

  const ensureReady = async () => {
    if (camera_ready) {
      receiver_message.textContent = IDLE_MESSAGE;
      return;
    }
    const generation = ++camera_generation;
    videoElement = document.getElementById("videoElement");
    let stream = null;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      if (generation !== camera_generation) {
        release_stream(stream);
        return;
      }
      camera_stream = stream;
      videoElement.srcObject = stream;
      canvas = document.createElement("canvas");
      context = canvas.getContext("2d");
      await new Promise((r) => setTimeout(r, 2000));
      if (generation !== camera_generation) {
        release_stream(stream);
        if (camera_stream === stream) {
          camera_stream = null;
          videoElement.srcObject = null;
        }
        return;
      }
      canvas.height = videoElement.videoHeight;
      canvas.width = videoElement.videoWidth;
      context.drawImage(videoElement, 0, 0);
      camera_ready = true;
      receiver_message.textContent = IDLE_MESSAGE;
    } catch (error) {
      release_stream(stream);
      if (camera_stream === stream) {
        camera_stream = null;
      }
      throw error;
    }
  };

  const setCameraError = (message) => {
    receiver_message.textContent = message;
  };

  const bind = () => {
    receiver_btn.addEventListener("click", () => {
      if (is_receiving) stop();
      else start();
    });
  };

  return {
    bind,
    stop,
    stopCamera,
    ensureReady,
    setCameraError,
    isActive: () => is_receiving,
  };
};
