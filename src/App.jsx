import React, { useEffect, useRef, useState } from "react";
const Camera = () => {
  const videoRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const timerIdRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showDownloadButton, setShowDownloadButton] = useState(false);
  const [cameraPermissionGranted, setCameraPermissionGranted] = useState(false);
  const [selectedCamera, setSelectedCamera] = useState("");
  const [cameraList, setCameraList] = useState([]);

  const [showDisclaimerModal, setShowDisclaimerModal] = useState(true);

  const getCameraDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        await navigator.mediaDevices.getUserMedia({ video: true });
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(
            (device) => device.kind === "videoinput",
        );
        if (videoDevices.length > 0) {
          console.log("videoDevices", videoDevices);
          setCameraList(videoDevices);
          setSelectedCamera(videoDevices[0].deviceId);
          setCameraPermissionGranted(true);
        }
      } else {
        console.error("getUserMedia is not supported on this device.");
        setCameraPermissionGranted(false);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const startCameraStream = async () => {
    try {
      console.log("selectedCamera", selectedCamera);
      if (cameraList.length > 0 && selectedCamera) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            deviceId: { exact: selectedCamera },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          mediaRecorderRef.current = new MediaRecorder(stream);
          setCameraPermissionGranted(true);

          mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
              recordedChunksRef.current.push(event.data);
            }
          };

          mediaRecorderRef.current.onstop = () => {
            setRecordingTime(0);
            setShowDownloadButton(true);
          };
        }
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
    }
  };

  const handleCameraChange = async (
      event,
  ) => {
    setSelectedCamera(event.target.value);
  };

  const startRecording = () => {
    if (mediaRecorderRef.current) {
      recordedChunksRef.current = [];
      mediaRecorderRef.current.start();
      setIsRecording(true);

      let startTime = Date.now();
      if (timerIdRef.current) {
        setRecordingTime(0);
        clearInterval(timerIdRef.current);
      }
      timerIdRef.current = setInterval(() => {
        setRecordingTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
    }
  };

  const stopRecording = () => {
    if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state === "recording"
    ) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const saveRecording = () => {
    const recordedBlob = new Blob(recordedChunksRef.current, {
      type: "video/mp4",
    });
    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement("a");
    document.body.appendChild(a);
    a.style.display = "none";
    a.href = url;
    a.download = `recording-${new Date().toISOString()}.mp4`;
    a.click();
    // URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  useEffect(() => {
    getCameraDevices().then(() => console.info("Module 1 initialized."));

    return () => {
      // Cleanup: Stop the camera stream and media recorder when the component unmounts
      if (videoRef.current && videoRef.current.srcObject) {
        // eslint-disable-next-line react-hooks/exhaustive-deps
        const tracks = videoRef.current.srcObject.getTracks();
        tracks.forEach((track) => track.stop());
      }

      if (
          mediaRecorderRef.current &&
          mediaRecorderRef.current.state === "recording"
      ) {
        mediaRecorderRef.current.stop();
      }

      if (timerIdRef.current) {
        clearInterval(timerIdRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (selectedCamera) {
      startCameraStream().then(() => console.info("Module 2 initialized."));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCamera]);

  return (
      <div className="mx-auto max-w-4xl text-dh-gray-100 p-4">
        {showDisclaimerModal && (
            <div className="fixed inset-0 bg-opacity-50 bg-gray-500 backdrop-blur-lg flex items-center justify-center">
              <div className="bg-white p-8 rounded-md shadow-md text-center">
                <p className="mb-4">
                  This is a disclaimer. Please read and accept before starting
                  recording.
                </p>
                <button
                    className="bg-green-400 px-4 py-2 rounded-xl text-dh-white-200"
                    onClick={() => setShowDisclaimerModal(false)}
                >
                  Accept
                </button>
              </div>
            </div>
        )}
        <div className="flex flex-col items-center my-8">
          <div className="mb-4">
            <label htmlFor="cameraSelect" className="mr-2">
              Select Camera:
            </label>
            <select
                id="cameraSelect"
                value={selectedCamera || ""}
                onChange={handleCameraChange}
                className="bg-white text-black px-4 py-2 rounded-md"
            >
              {cameraList.map((camera) => (
                  <option key={camera.deviceId} value={camera.deviceId}>
                    {camera.label || `Camera ${cameraList.indexOf(camera) + 1}`}
                  </option>
              ))}
            </select>
          </div>
          <video
              ref={videoRef}
              className={
                !cameraPermissionGranted
                    ? "hidden"
                    : "rounded-2xl w-full h-auto max-w-2xl"
              }
              width="1280"
              height="720"
              playsInline
              autoPlay
              muted
          ></video>
          {!cameraPermissionGranted ? (
              <div className="h-40 flex items-center justify-center">
                Unable to get camera permission
              </div>
          ) : (
              <div className="my-4 flex flex-wrap justify-center gap-4">
                {showDownloadButton && !isRecording && (
                    <div>
                      <button
                          onClick={saveRecording}
                          className="bg-green-400 px-4 py-2 rounded-xl text-dh-white-200"
                      >
                        Download Last Recording
                      </button>
                    </div>
                )}
                <div>
                  {!isRecording ? (
                      <button
                          onClick={startRecording}
                          className={`px-4 py-2 rounded-xl ${
                            recordedChunksRef?.current?.length > 0
                                ? "bg-gray-300"
                                : "bg-green-400 text-dh-white-200"
                          }`}

                      >
                        {recordedChunksRef?.current?.length > 0
                            ? "Restart Recording"
                            : "Start Recording"}
                      </button>
                  ) : (
                      <>
                        <button
                            onClick={stopRecording}
                            className="bg-red-400 px-4 py-2 rounded-xl "
                        >
                          Stop Recording - {recordingTime} seconds
                        </button>
                      </>
                  )}
                </div>
              </div>
          )}
        </div>
      </div>
  );
};

export default Camera;
