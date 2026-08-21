(() => {
  const mode_sender_btn = document.getElementById("mode_sender_btn");
  const mode_receiver_btn = document.getElementById("mode_receiver_btn");
  const sender_panel = document.getElementById("sender_panel");
  const receiver_panel = document.getElementById("receiver_panel");

  const sender = QrTransfer.createSender();
  const receiver = QrTransfer.createReceiver();

  const set_mode = async (mode) => {
    const is_sender = mode === "sender";
    if (!is_sender && sender.isActive()) sender.stop();
    if (is_sender && receiver.isActive()) receiver.stop();

    sender_panel.hidden = !is_sender;
    receiver_panel.hidden = is_sender;
    mode_sender_btn.classList.toggle("active", is_sender);
    mode_receiver_btn.classList.toggle("active", !is_sender);

    const url = new URL(window.location.href);
    url.searchParams.set("mode", mode);
    history.replaceState(null, "", url);

    if (is_sender) {
      receiver.stopCamera();
      sender.ensureReady();
    } else {
      try {
        await receiver.ensureReady();
      } catch (error) {
        console.error("Camera init failed: ", error);
        receiver.setCameraError(
          "Camera access is required for Receiver mode"
        );
      }
    }
  };

  document.addEventListener("DOMContentLoaded", () => {
    console.log("Application Initialized ...");
    sender.bind();
    receiver.bind();
    mode_sender_btn.addEventListener("click", () => set_mode("sender"));
    mode_receiver_btn.addEventListener("click", () => set_mode("receiver"));

    const params = new URLSearchParams(window.location.search);
    const initial =
      params.get("mode") === "receiver" ? "receiver" : "sender";
    set_mode(initial);
  });
})();
