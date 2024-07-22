import { useCallback, useState, useEffect, useRef } from "react";
import { useDropzone } from "react-dropzone";
import axios from "axios";

function MyDropzone() {
  const [tdata, setTdata] = useState("");
  const [audioSrc, setAudioSrc] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const [open, setOpen] = useState(false);
  const handleAudioUpload = (file) => {
    const formData = new FormData();
    formData.append("audio", file);
    const apikey = document.getElementById("inputapi").value;
    const params = new URLSearchParams();
    params.append("api_key", apikey);
    axios
      .post("https://punt-partners-b.vercel.app/api/taudio", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
        params: params,
      })
      .then((response) => {
        if (response.data.openapiResponse === "ERROR") {
          setOpen(true);
        }
        console.log("Transcription Result:", response.data.result);
        setTdata(response.data.result);
        const audioBlob = new Blob(
          [Uint8Array.from(atob(response.data.audio), (c) => c.charCodeAt(0))],
          { type: "audio/wav" }
        );
        setAudioSrc(URL.createObjectURL(audioBlob));
      })
      .catch((error) => {
        console.error("Error uploading audio:", error);
      });
  };

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      handleAudioUpload(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  useEffect(() => {
    if (tdata) {
      console.log("Updated Transcription Data:", tdata);
    }
  }, [tdata]);

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      mediaRecorderRef.current = new MediaRecorder(stream);
      mediaRecorderRef.current.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, {
          type: "audio/wav",
        });
        audioChunksRef.current = [];
        const audioFile = new File([audioBlob], "recording.wav", {
          type: "audio/wav",
        });
        handleAudioUpload(audioFile);
      };
      mediaRecorderRef.current.start();
      setIsRecording(true);
    });
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-200 p-6">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-lg">
        <h2 className="text-xl font-semibold mb-4 text-gray-800">
          Question and Answer
        </h2>

        <div className="p-4 bg-gray-100 rounded-md mb-4">
          <p className="text-gray-700 whitespace-pre-wrap">{tdata}</p>
        </div>

        <div
          {...getRootProps()}
          className="border-2 border-dashed border-gray-400 p-6 w-full text-center mb-4 rounded-md hover:border-gray-500 focus:outline-none"
        >
          <input {...getInputProps()} />
          {isDragActive ? (
            <p className="text-gray-700">Drop the files here ...</p>
          ) : (
            <p className="text-gray-700">
              Drag 'n' drop some files here, or click to select files
            </p>
          )}
        </div>
        {open && <div>Open API key is not valid</div>}
        <div className="flex justify-center mb-4">
          {isRecording ? (
            <button
              onClick={stopRecording}
              className="px-4 py-2 bg-red-500 text-white rounded-md hover:bg-red-600 focus:outline-none"
            >
              Stop Recording
            </button>
          ) : (
            <button
              onClick={startRecording}
              className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none"
            >
              Start Recording
            </button>
          )}
        </div>

        <div className="p-4 bg-gray-100 rounded-md mb-4">
          <p className="text-gray-700 mb-2">Enter the API key:</p>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md text-gray-700"
            id="inputapi"
          />
        </div>

        {audioSrc && (
          <div className="max-w-lg mx-auto">
            <audio controls src={audioSrc} className="w-full rounded-md">
              Your browser does not support the audio element.
            </audio>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyDropzone;
