import React, { useState, useEffect } from "react";
import axiosClient from "./axiosClient";
import * as tj from "@mapbox/togeojson";
import rewind from "@mapbox/geojson-rewind";
import { saveAs } from "file-saver";
import tokml from "tokml";
import KMLViewer from "./viewer";
import ReusableKMLViewer from "./reusableViewer";

const KMLEditor = () => {
  //suggestions
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const debounce = (func, timeout = 300) => {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        func.apply(this, args);
      }, timeout);
    };
  };

  const onSearch = (e) => {
    setSearch(e.target.value);
    debouncedSearch();
  };

  const onFindPlaces = async () => {
    if (search != "") {
      try {
        await axiosClient
          .get(
            `https://api.geoapify.com/v1/geocode/autocomplete?text=${search}&format=json&apiKey=ed24fe3439e946d5a60cda3a1b687587`
          )
          .then((response) => setSearchResults(response.data.results));
      } catch (error) {
        console.error(error);
      }
    }
  };

  const debouncedSearch = debounce(onFindPlaces);

  //displaying current locations
  const [layer, setLayer] = useState(null);
  const [center, setCenter] = useState([1.294385, 103.7727545]);
  const [currentLocations, setCurrentLocations] = useState([]);
  const myAPIKey = "ed24fe3439e946d5a60cda3a1b687587";

  useEffect(() => {
    const layer = convertToGeoJSON();
    setLayer(layer);
  }, [currentLocations]);

  //api call to parse coords into location
  const parseCoordsToLocation = async (lat, long) => {
    try {
      const response = await axiosClient.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${long}&format=json&apiKey=ed24fe3439e946d5a60cda3a1b687587`
      );
      return response;
    } catch (error) {
      console.error(error);
    }
  };

  const convertCoordsToLocations = async (layer) => {
    if (layer != null) {
      const coords = layer.features.map((feature) => {
        const coord = feature.geometry.coordinates;
        return [coord[1], coord[0]];
      });

      try {
        const promises = coords.map(async (coord) => {
          const lat = coord[0].toString();
          const long = coord[1].toString();
          return await parseCoordsToLocation(lat, long);
        });

        const locations = await Promise.all(promises);
        setCurrentLocations(locations);
      } catch (error) {
        console.error(error);
        // Handle error if needed
        return []; // Return an empty array or handle it appropriately
      }
    }
  };

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
    setLayer(converted); // save converted geojson to hook state
    setCenter([
      converted.features[0].geometry.coordinates[1],
      converted.features[0].geometry.coordinates[0],
    ]);
    convertCoordsToLocations(converted);
  };

  const onAddItinerary = (e) => {
    const value = e.target.value.split(" ");
    parseCoordsToLocation(value[0], value[1]).then((response) => {
      const newListOfLocations = [...currentLocations, response];
      setCurrentLocations(newListOfLocations);
    });
  };

  const onDeleteLocation = (e) => {
    const value = e.target.value.split(" ");
    const newListOfLocations = currentLocations.filter(
      (location) =>
        location.data.query.lat != value[0] &&
        location.data.query.lon != value[1]
    );
    setCurrentLocations(newListOfLocations);
  };

  //getting directions between locations
  const [mode, setMode] = useState("drive");
  const [directions, setDirections] = useState([]);
  const [geometry, setGeometry] = useState([]);
  const getDirectionsBtwLocations = async () => {
    if (currentLocations.length > 1) {
      let formattedWaypoints = "";
      currentLocations.forEach(
        (location) =>
          (formattedWaypoints +=
            location.data.query.lat + "," + location.data.query.lon + "|")
      );
      formattedWaypoints = formattedWaypoints.substring(
        0,
        formattedWaypoints.length - 1
      );
      try {
        await axiosClient
          .get(
            `https://api.geoapify.com/v1/routing?waypoints=${formattedWaypoints}&mode=${mode}&apiKey=ed24fe3439e946d5a60cda3a1b687587`
          )
          .then((response) => {
            setDirections(response.data.features[0].properties.legs);
            setGeometry(response.data.features[0].geometry.coordinates);
          });
      } catch (error) {
        console.error(error);
      }
    }
  };

  useEffect(() => {
    getDirectionsBtwLocations();
  }, [currentLocations, mode]);

  //converting and exporting as kml

  const convertToGeoJSON = () => {
    if (currentLocations.length > 0) {
      const features = currentLocations.map((location) => {
        const lat = location.data.query.lat;
        const lon = location.data.query.lon;
        const name = location.data.results[0].address_line1;
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
          properties: {
            name: name,
          },
        };
      });

      const geoJSON = {
        type: "FeatureCollection",
        features: features,
      };

      return geoJSON;
    }
  };

  const downloadAsKML = () => {
    const geoJSON = convertToGeoJSON();

    // Convert GeoJSON to KML
    const convertedData = tokml(geoJSON);

    // Create a Blob from the KML data
    const blob = new Blob([convertedData], {
      type: "kml",
    });

    // Save the Blob as a file
    saveAs(blob, "3106testerKML.kml");
  };

  const onDragStart = (event, index) => {
    event.dataTransfer.setData("index", index.toString());
  };

  const onDragOver = (event) => {
    event.preventDefault();
  };

  const onDrop = (event, index) => {
    const dragIndex = parseInt(event.dataTransfer.getData("index"));
    const dropIndex = index;

    if (dragIndex !== dropIndex) {
      const updatedLocations = [...currentLocations];
      const [dragItem] = updatedLocations.splice(dragIndex, 1);
      updatedLocations.splice(dropIndex, 0, dragItem);
      setCurrentLocations(updatedLocations);
    }
  };

  return (
    <div>
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          justifyContent: "space-evenly",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", width: "50%" }}>
          <input type="file" accept=".kml" onChange={handleFileSelection} />
          <div>
            <label>mode of transport:</label>
            <select
              onChange={(e) => setMode(e.target.value)}
              style={{ maxWidth: "20%" }}
            >
              <option value="drive">Car</option>
              <option value="walk">Walking</option>
              <option value="cycle">Cycling</option>
            </select>
          </div>
          {console.log({ currentLocations })}
          {currentLocations.length > 0 && (
            <div>
              <p>current locations entered</p>
              <ul>
                {currentLocations.map((location, index) => (
                  <li
                    style={{ marginBottom: "20px" }}
                    key={index}
                    draggable="true"
                    onDragStart={(event) => onDragStart(event, index)}
                    onDragOver={onDragOver}
                    onDrop={(event) => onDrop(event, index)}
                  >
                    <div>{location.data.results[0].address_line1}</div>
                    <div>{location.data.results[0].address_line2}</div>
                    <button
                      onClick={onDeleteLocation}
                      value={`${location.data.query.lat} ${location.data.query.lon}`}
                    >
                      delete
                    </button>
                    <div>
                      {index < directions.length &&
                        directions[index].steps.map((step) => (
                          <dd
                            style={{
                              border: "solid",
                              borderColor: "black",
                              padding: "5px",
                            }}
                          >
                            {step.instruction.text}
                          </dd>
                        ))}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {currentLocations.length > 0 && (
            <button onClick={downloadAsKML}>download as kml</button>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", width: "50%" }}>
          <p>search for locations</p>
          <input onChange={onSearch} value={search} />
          {console.log({ searchResults })}
          {searchResults.length > 0 && (
            <div>
              <p>search results</p>
              <ul>
                {searchResults.map((result) => (
                  <li style={{ marginBottom: "20px" }}>
                    <div>{result.address_line1}</div>
                    <div>{result.address_line2}</div>
                    <div value={result.lon}>long: {result.lon}</div>
                    <div value={result.lat}>lat: {result.lat}</div>
                    <button
                      onClick={onAddItinerary}
                      value={`${result.lat} ${result.lon}`}
                    >
                      add to itinerary
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
      <div>
        <ReusableKMLViewer layer={layer} center={center} geometry={geometry} />
      </div>
    </div>
  );
};

export default KMLEditor;
