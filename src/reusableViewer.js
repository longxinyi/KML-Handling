import React, { useState, useEffect } from "react";
import { MapContainer, TileLayer, GeoJSON, Polyline } from "react-leaflet";
import { Icon, marker } from "leaflet";
import "leaflet/dist/leaflet.css";
import "./leafletStyles.css";

export default function ReusableKMLViewer({ layer, center, geometry }) {
  const [key, setKey] = useState(0); // Add a key state

  useEffect(() => {
    setKey((prevKey) => prevKey + 1); // Update the key when center changes
  }, [center, layer]);

  const customIcon = new Icon({
    iconUrl: "https://cdn-icons-png.flaticon.com/512/3699/3699561.png",
    iconSize: [38, 38],
  });
  const pointToLayer = (feature, latlng) => {
    const sequenceNumber = layer.features.indexOf(feature) + 1;
    return marker(latlng, { icon: customIcon }).bindPopup(
      `${sequenceNumber}. ${feature.properties.name}`
    );
  };

  const drawLinesBetweenLocations = () => {
    if (!layer || !layer.features || !geometry) return null;

    const lines = [];
    const flattenedGeometry = geometry.flat();
    for (let i = 0; i < flattenedGeometry.length - 1; i++) {
      const startCoords = [flattenedGeometry[i][1], flattenedGeometry[i][0]];
      const endCoords = [
        flattenedGeometry[i + 1][1],
        flattenedGeometry[i + 1][0],
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
          {layer && (
            <GeoJSON data={layer} key={key} pointToLayer={pointToLayer} />
          )}
          {drawLinesBetweenLocations() &&
            drawLinesBetweenLocations().map((line, index) => (
              <Polyline positions={line} key={index} color="red" />
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
