window.QrTransfer = window.QrTransfer || {};

QrTransfer.CHUNK_SIZE = 250;

QrTransfer.encodeData = (index, input_bytes) => {
  let encoded_string = String.fromCharCode.apply(null, input_bytes);
  let utf8Encoder = new TextEncoder();
  let utf8_bytes = utf8Encoder.encode(encoded_string);
  let encoded_data = btoa(String.fromCharCode.apply(null, utf8_bytes));
  return index + "," + encoded_data;
};

QrTransfer.decodeData = (input_string) => {
  const encoded_data = atob(input_string.split(",")[1]);
  const encoded_array = Array.from(encoded_data, (char) => char.charCodeAt(0));
  const utf8Decoder = new TextDecoder();
  const output_string = utf8Decoder.decode(new Uint8Array(encoded_array));
  const data_array = Array.from(output_string, (char) => char.charCodeAt(0));
  return {
    index: parseInt(input_string.split(",")[0]),
    data: data_array,
  };
};
