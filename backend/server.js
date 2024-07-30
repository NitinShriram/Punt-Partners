const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const multer = require("multer");
const { createClient } = require("@deepgram/sdk");
const fs = require("fs");
const axios = require("axios");
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5001;
const DEEPGRAM_API_KEY = process.env.DEEPGRAM_API_KEY;
const WOLFRAM_APP_ID = process.env.WOLFRAM_APP_ID;

if (!DEEPGRAM_API_KEY || !WOLFRAM_APP_ID) {
  console.error("DEEPGRAM_API_KEY or WOLFRAM_APP_ID is not defined");
  process.exit(1);
}

const deepgram = createClient(DEEPGRAM_API_KEY);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const getAnswer = async (query) => {
  try {
    const response = await axios.get(
      `http://api.wolframalpha.com/v1/spoken?i=${encodeURIComponent(
        query
      )}&appid=${WOLFRAM_APP_ID}`
    );
    return response.data;
  } catch (error) {
    console.error(
      "Error in getAnswer:",
      error.response ? error.response.data : error.message
    );
    return "Could you please clarify the question?";
    throw new Error("Failed to get answer from Wolfram Alpha API");
  }
};

const getAudio = async (text) => {
  try {
    const response = await deepgram.speak.request(
      { text },
      {
        model: "aura-asteria-en",
        encoding: "linear16",
        container: "wav",
      }
    );
    const stream = await response.getStream();
    const buffer = await getAudioBuffer(stream);
    return buffer;
  } catch (error) {
    console.error("Error generating audio:", error.message);
    throw new Error("Failed to generate audio from Deepgram");
  }
};

const getAudioBuffer = async (response) => {
  const reader = response.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }

  const dataArray = chunks.reduce(
    (acc, chunk) => Uint8Array.from([...acc, ...chunk]),
    new Uint8Array(0)
  );

  return Buffer.from(dataArray.buffer);
};

app.post("/api/taudio", upload.single("audio"), async (req, res) => {
  try {
    const audioBuffer = req.file.buffer;
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: "nova-2",
        smart_format: true,
      }
    );

    if (error) {
      console.error("Transcription error:", error);
      return res.status(500).json({ error: "Transcription failed" });
    }

    const text = result.results.channels[0].alternatives[0].transcript;
    const answer = await getAnswer(text);
    console.log(answer);
    const audioData = await getAudio(answer);

    res.json({
      openapiResponse: "SUCCESS",
      result: text,
      audio: audioData.toString("base64"),
    });
  } catch (error) {
    console.error("Error processing audio:", error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.get("/", async (req, res) => {
  res.send("<div>Hello</div>");
});
