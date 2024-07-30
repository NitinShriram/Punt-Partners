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

    axios
      .post("https://voicequery-ai-backend.vercel.app/api/taudio", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      })
      .then((response) => {
        console.log("Response from server:", response.data);
        if (response.data.openapiResponse === "ERROR") {
          setOpen(true);
        } else {
          console.log("Transcription Result:", response.data.result);
          setTdata(response.data.result);
          const audioBlob = new Blob(
            [
              Uint8Array.from(atob(response.data.audio), (c) =>
                c.charCodeAt(0)
              ),
            ],
            { type: "audio/wav" }
          );
          setAudioSrc(URL.createObjectURL(audioBlob));
        }
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
    <>
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4 md:p-6">
        <div className="text-5xl font-extrabold mb-4 text-white text-center transition-colors duration-300 hover:text-green-400">
          VOICE
          <span className="text-green-400 hover:text-white transition-colors duration-300">
            {" "}
            QUERY
          </span>
          AI
        </div>

        <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl">
          <div className="p-4 bg-gray-700 rounded-md mb-4 min-h-[100px]">
            <p className="text-gray-200 whitespace-pre-wrap">{tdata}</p>
          </div>

          <div
            {...getRootProps()}
            className="border-2 border-dashed border-green-500 p-6 w-full text-center mb-4 rounded-md hover:border-green-600 focus:outline-none transition-colors bg-gray-700 text-gray-200"
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here ...</p>
            ) : (
              <p>Drag and drop some files here, or click to select files</p>
            )}
          </div>
          {open && (
            <div
              className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4"
              role="alert"
            >
              <strong className="font-bold">Error:</strong>
              <span className="block sm:inline">
                {" "}
                Open API key is not valid.
              </span>
            </div>
          )}
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
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 focus:outline-none"
              >
                Start Recording
              </button>
            )}
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
    </>
  );
}

export default MyDropzone;
