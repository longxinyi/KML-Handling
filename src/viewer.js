import React, { useState, useEffect } from "react";
import * as tj from "@mapbox/togeojson";
import rewind from "@mapbox/geojson-rewind";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import { Icon, marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletStyles.css";

export default function KMLViewer() {
  const [layer, setLayer] = useState(null);
  const [center, setCenter] = useState([1.294385, 103.7727545]);

  const [key, setKey] = useState(0); // Add a key state

  useEffect(() => {
    setKey((prevKey) => prevKey + 1); // Update the key when center changes
  }, [center]);

  const handleFileSelection = (event) => {
    const file = event.target.files[0]; // get file
    const reader = new FileReader();

    // on load file end, parse the text read
    reader.onloadend = (event) => {
      const text = event.target.result;
      parseKMLtoGeoJSON(text);
    };

    reader.readAsText(file); // start reading file
  };

  const parseKMLtoGeoJSON = (text) => {
    const dom = new DOMParser().parseFromString(text, "text/xml"); // create xml dom object
    const converted = tj.kml(dom); // convert xml dom to geojson
    rewind(converted, false); // correct right hand rule

    //handling of coordinates
    converted.features.forEach((feature) => {
      const newCoords = [
        feature.geometry.coordinates[1],
        feature.geometry.coordinates[0],
      ];

      return {
        ...feature,
        geometry: { type: "Point", coordinates: newCoords },
      };
    });
    console.log(converted);
    setLayer(converted); // save converted geojson to hook state
    setCenter([
      converted.features[0].geometry.coordinates[1],
      converted.features[0].geometry.coordinates[0],
    ]);
  };

  const customIcon = new Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3699/3699561.png",
    iconSize: [38, 38],
  });
  const pointToLayer = (feature, latlng) => {
    console.log("feature", feature);
    const sequenceNumber = layer.features.indexOf(feature) + 1;
    return marker(latlng, { icon: customIcon }).bindPopup(
      `${sequenceNumber}. ${feature.properties.name}`
    );
  };

  const drawLinesBetweenLocations = () => {
    if (!layer || !layer.features) return null;

    const lines = [];
    for (let i = 0; i < layer.features.length - 1; i++) {
      const startCoords = [
        layer.features[i].geometry.coordinates[1],
        layer.features[i].geometry.coordinates[0],
      ];
      const endCoords = [
        layer.features[i + 1].geometry.coordinates[1],
        layer.features[i + 1].geometry.coordinates[0],
      ];
      lines.push([startCoords, endCoords]);
    }
    return lines;
  };

  return (
    <div className="App">
      <div>
        <MapContainer
          key={key}
          center={center}
          zoom={8}
          scrollWheelZoom={false}
          style={{ height: "500px" }}
        >
          <TileLayer
            attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {layer && <GeoJSON data={layer} pointToLayer={pointToLayer} />}
          {layer &&
            drawLinesBetweenLocations().map((line, index) => (
              <Polyline positions={line} key={index} color="red" />
            ))}
        </MapContainer>
      </div>
      <input type="file" accept=".kml" onChange={handleFileSelection} />
    </div>
  );
}
