"use client";

import { Upload } from "lucide-react";
import { useState } from "react";
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
  const [res, setResponse] = useState<any | null>(null);

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
    const response = await fetch("http://10.1.3.104:5001/upload", {
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
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-8 bg-gray-900">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-8 text-center">
        AI Speech Analysis
      </h1>

      <div className="max-w-4xl w-full space-y-8">
        <div className="bg-gray-900 rounded-lg shadow-xl p-6 border border-gray-800">
          <div className="flex flex-col items-center justify-center border-2 border-dashed border-gray-700 rounded-lg p-12 hover:border-gray-600 transition-colors bg-gray-800/50">
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              id="video-upload"
            />
            <label
              htmlFor="video-upload"
              className="cursor-pointer flex flex-col items-center"
            >
              <Upload className="h-12 w-12 text-gray-400 mb-3 group-hover:text-gray-300" />
              <span className="text-gray-300 font-medium">
                {selectedFile ? selectedFile.name : "Upload your video"}
              </span>
              <span className="text-sm text-gray-500 mt-1">
                Drag and drop or click to select
              </span>
            </label>
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
      </div>
    </div>
  );
};

export default Speech;
