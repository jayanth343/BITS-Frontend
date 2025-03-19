"use client";

import { Upload } from "lucide-react";
import { useState } from "react";

const Speech = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  return (
    <div className="h-screen w-full flex flex-col items-center justify-center">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent mb-8 text-center">
        AI Speech Analysis
      </h1>
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
        >
          Get AI Review
        </button>
      </div>
    </div>
  );
};

export default Speech;
