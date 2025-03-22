"use client";

import { Upload } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface Weakness {
  Weakness: string;
  "How to improve": string;
}

interface AnalysisResponse {
  Summary: string;
  Strengths: string;
  Weaknesses: Weakness[];
  Conclusion: string;
}

const Speech = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeechLoading, setIsSpeechLoading] = useState(false);
  const [res, setResponse] = useState<any | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Add new state variables for webcam recording
  const [isRecording, setIsRecording] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedChunks, setRecordedChunks] = useState<Blob[]>([]);
  const [recordingPreview, setRecordingPreview] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);

  console.log("Current res state:", res);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };
  const fetchData = async () => {
    if (!selectedFile) return;
    const formData = new FormData();
    formData.append("video", selectedFile);
    const response = await fetch("http://127.0.0.1:5000/upload", {
      method: "POST",
      body: formData,
    });
    const data = await response.json();
    return data;
  };
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      const data = await fetchData();
      if (data) {
        console.log("Setting response with data:", data);
        setResponse(data);
      }
    } catch (error) {
      console.error("Upload error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConvertAllToSpeech = async () => {
    if (!res) return;

    const analysisData = JSON.parse(res);
    const textToConvert = `
      Summary: ${analysisData.Summary}
      Strengths: ${analysisData.Strengths}
      Weaknesses: ${analysisData.Weaknesses.map(
        (w: Weakness) => w.Weakness + ": " + w["How to improve"]
      ).join(". ")}
      Conclusion: ${analysisData.Conclusion}
    `;

    // Use the handleConvert logic from TextToSpeech component
    setIsSpeechLoading(true);
    setAudioUrl(null);

    try {
      const formData = new FormData();
      formData.append("report", textToConvert);

      const response = await fetch("http://localhost:5000/tts", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(
          `Server returned ${response.status}: ${response.statusText}`
        );
      }

      const audioBlob = await response.blob();
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);

      if (audioRef.current) {
        audioRef.current
          .play()
          .catch((err) => console.log("Autoplay prevented:", err));
      }
    } catch (error) {
      console.error("Error:", error);
      if (error instanceof Error) {
        alert("Error converting text to speech: " + error.message);
      } else {
        alert("An unknown error occurred");
      }
    } finally {
      setIsSpeechLoading(false);
    }
  };

  // Add webcam handling functions
  const startWebcam = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      setStream(mediaStream);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing webcam:", error);
      alert("Unable to access webcam. Please check permissions.");
    }
  };

  const startRecording = () => {
    if (!stream) return;

    setRecordedChunks([]);
    setRecordingPreview(null);

    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: "video/mp4",
    });

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        setRecordedChunks((prev) => [...prev, event.data]);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(recordedChunks, { type: "video/webm" });
      const url = URL.createObjectURL(blob);
      setRecordingPreview(url);

      // Convert to MP4-like format for the backend
      const videoFile = new File([blob], "recording.webm", {
        type: "video/webm",
      });
      setSelectedFile(videoFile);
    };

    mediaRecorderRef.current = mediaRecorder;
    mediaRecorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Clean up function for webcam
  const stopWebcam = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    }
  };

  // Initialize webcam when component mounts
  useEffect(() => {
    startWebcam();

    // Clean up when component unmounts
    return () => {
      stopWebcam();
    };
  }, []);

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 bg-gray-900">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-8 text-center">
        AI Speech Analysis
      </h1>

      <div className="max-w-4xl w-full space-y-8">
        <div className="bg-gray-900 rounded-lg shadow-xl p-6 border border-gray-800">
          {/* Webcam component */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
              Record Your Speech
            </h2>

            <div className="relative aspect-video bg-black rounded-lg overflow-hidden mb-4">
              {recordingPreview ? (
                <video
                  src={recordingPreview}
                  controls
                  className="w-full h-full object-cover"
                />
              ) : (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              )}

              {isRecording && (
                <div className="absolute top-4 right-4 flex items-center">
                  <div className="w-3 h-3 rounded-full bg-red-500 mr-2 animate-pulse"></div>
                  <span className="text-white text-sm font-medium">
                    Recording
                  </span>
                </div>
              )}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={startRecording}
                disabled={isRecording || !stream}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md font-medium hover:bg-red-700 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Start Recording
              </button>

              <button
                onClick={stopRecording}
                disabled={!isRecording}
                className="flex-1 bg-gray-700 text-white py-2 px-4 rounded-md font-medium hover:bg-gray-800 transition-all disabled:bg-gray-600 disabled:cursor-not-allowed"
              >
                Stop Recording
              </button>
            </div>

            {selectedFile && recordingPreview && (
              <p className="text-sm text-green-500 mt-2">
                Recording saved! Click "Get AI Review" to analyze.
              </p>
            )}
          </div>

          <button
            className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-3 px-4 rounded-md font-medium hover:from-blue-700 hover:to-purple-700 transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg"
            disabled={!selectedFile}
            onClick={handleSubmit}
          >
            {isLoading ? "Analyzing..." : "Get AI Review"}
          </button>
        </div>

        {res && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-gray-900 rounded-lg shadow-xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
                Summary
              </h2>
              <p className="text-gray-300">{JSON.parse(res).Summary}</p>
            </div>

            <div className="bg-gray-900 rounded-lg shadow-xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
                Strengths
              </h2>
              <p className="text-gray-300">{JSON.parse(res).Strengths}</p>
            </div>

            <div className="bg-gray-900 rounded-lg shadow-xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
                Areas for Improvement
              </h2>
              <div className="space-y-4">
                {JSON.parse(res).Weaknesses[0] &&
                  JSON.parse(res).Weaknesses.map(
                    (weakness: Weakness, index: number) => (
                      <Accordion
                        type="single"
                        collapsible
                        className="w-full bg-gray-800/50 rounded-lg overflow-hidden"
                      >
                        <AccordionItem
                          value={weakness.Weakness}
                          className="border-b border-gray-700 last:border-0"
                        >
                          <AccordionTrigger className="hover:bg-gray-800/70 px-4 py-4 transition-all">
                            <span className="text-gray-200 font-medium">
                              {weakness.Weakness}
                            </span>
                          </AccordionTrigger>
                          <AccordionContent className="px-4 py-3 text-gray-400">
                            {weakness["How to improve"]}
                          </AccordionContent>
                        </AccordionItem>
                      </Accordion>
                    )
                  )}
              </div>
            </div>

            <div className="bg-gray-900 rounded-lg shadow-xl p-6 border border-gray-800">
              <h2 className="text-xl font-semibold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-4">
                Conclusion
              </h2>
              <p className="text-gray-300">{JSON.parse(res).Conclusion}</p>
            </div>
          </div>
        )}

        <button
          className="w-full mt-6 bg-gradient-to-r from-green-600 to-teal-600 text-white py-3 px-4 rounded-md font-medium hover:from-green-700 hover:to-teal-700 transition-all disabled:from-gray-600 disabled:to-gray-700 disabled:cursor-not-allowed shadow-lg"
          disabled={!res}
          onClick={handleConvertAllToSpeech}
        >
          {isSpeechLoading
            ? "Converting to Speech..."
            : "Convert All to Speech"}
        </button>

        {audioUrl && (
          <div className="mt-4">
            <h3 className="text-lg font-semibold mb-2">Generated Audio:</h3>
            <audio ref={audioRef} controls className="w-full" src={audioUrl} />
            <p className="text-sm text-gray-500 mt-1">
              If audio doesn't play automatically, click the play button above.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Speech;
