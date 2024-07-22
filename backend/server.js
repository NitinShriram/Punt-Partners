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
const apiKey = process.env.OPENAI_API_KEY;

const getAnswer = async (api_key, question) => {
  try {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-3.5-turbo",
        messages: [{ role: "user", content: question }],
        max_tokens: 150,
        temperature: 0.7,
      },
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${api_key}`,
        },
      }
    );

    console.log("Response:", response.data.choices[0].message.content.trim());
  } catch (error) {
    console.error(
      "Error:",
      error.response ? error.response.data : error.message
    );
  }
};

if (!DEEPGRAM_API_KEY) {
  console.error("DEEPGRAM_API_KEY is not defined");
  process.exit(1);
}

const deepgram = createClient(process.env.DEEPGRAM_API_KEY);

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

const getAudio = async (text) => {
  const response = await deepgram.speak.request(
    { text },
    {
      model: "aura-asteria-en",
      encoding: "linear16",
      container: "wav",
    }
  );
  const stream = await response.getStream();
  const headers = await response.getHeaders();
  if (stream) {
    const buffer = await getAudioBuffer(stream);
    fs.writeFile("output.wav", buffer, (err) => {
      if (err) {
        console.error("Error writing audio to file:", err);
      } else {
        console.log("Audio file written to output.wav");
      }
    });
    return buffer;
  } else {
    console.error("Error generating audio:", stream);
    throw new Error("Error generating audio");
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
    console.log(audioBuffer);
    const { api_key } = req.query;
    console.log(api_key);
    const { result, error } = await deepgram.listen.prerecorded.transcribeFile(
      audioBuffer,
      {
        model: "nova-2",
        smart_format: true,
      }
    );
    const text = result.results.channels[0].alternatives[0].transcript;

    let ans = await getAnswer(api_key, text);
    if (!ans) {
      ans = "Invalid API key";
    }
    const audioData = await getAudio(ans);
    res.json({
      openapiResponse: !ans ? "ERROR" : "SUCCESS",
      result: text,
      audio: audioData.toString("base64"),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
