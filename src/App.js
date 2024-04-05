import logo from "./logo.svg";
import "./App.css";
import KMLUploader from "./uploader";
import KMLViewer from "./viewer";
import KMLEditor from "./editor";
import { useState } from "react";

function App() {
  const [tab, setTab] = useState("viewer");
  const changeTab = (e) => {
    setTab(e.target.value);
  };
  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          border: "solid",
          borderColor: "black",
          padding: "10px",
          margin: "20px",
          justifyContent: "space-evenly",
        }}
      >
        <button onClick={changeTab} value="uploader">
          uploader
        </button>
        <button onClick={changeTab} value="viewer">
          viewer
        </button>
        <button onClick={changeTab} value="editor">
          editor
        </button>
      </div>
      <div>
        {tab == "uploader" && <KMLUploader />}
        {tab == "viewer" && <KMLViewer />}
        {tab == "editor" && <KMLEditor />}
      </div>
    </div>
  );
}

export default App;
