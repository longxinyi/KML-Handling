import React, { useState } from "react";
import axiosClient from "./axiosClient";

const KMLUploader = () => {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleUpload = async () => {
    if (file) {
      const formData = new FormData();
      formData.append("file", file);
      try {
        await axiosClient.post(
          "/posts/create?username=xinyi",
          //request body below
          {
            createdDateTime: "2024-02-02T22:30:00Z",
            likeCount: 0,
            kmlFile: file,
          }
        );
      } catch (error) {
        console.error(error);
      }
    }
  };

  return (
    <div>
      <input type="file" accept=".kml" onChange={handleFileChange} />
      <button onClick={handleUpload}>Upload</button>
    </div>
  );
};

export default KMLUploader;
