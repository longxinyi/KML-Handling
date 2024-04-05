import React, { useState } from "react";
import axiosClient from "./axiosClient";
import * as tj from "@mapbox/togeojson";
import rewind from "@mapbox/geojson-rewind";
import { saveAs } from "file-saver";
import tokml from "tokml";

const KMLEditor = () => {
  //suggestions
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  const debounce = (func, timeout = 400) => {
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
  const [currentLocations, setCurrentLocations] = useState([]);
  const myAPIKey = "ed24fe3439e946d5a60cda3a1b687587";

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
    convertCoordsToLocations(converted);
  };

  const onAddItinerary = (e) => {
    // const newListOfLocations = [...currentLocations, e.target.value];
    // setCurrentLocations(newListOfLocations);
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

  //converting and exporting as kml

  const convertToGeoJSON = () => {
    if (currentLocations.length > 0) {
      const features = currentLocations.map((location) => {
        const lat = location.data.query.lat;
        const lon = location.data.query.lon;
        return {
          type: "Feature",
          geometry: {
            type: "Point",
            coordinates: [lon, lat],
          },
          properties: {
            name: "3106 project",
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

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-evenly",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column" }}>
        <input type="file" accept=".kml" onChange={handleFileSelection} />
        {currentLocations.length > 0 && (
          <div>
            <p>current locations entered</p>
            <ul>
              {currentLocations.map((location) => (
                <li>
                  <div>{location.data.results[0].address_line1}</div>
                  <div>{location.data.results[0].address_line2}</div>
                  <button
                    onClick={onDeleteLocation}
                    value={`${location.data.query.lat} ${location.data.query.lon}`}
                  >
                    delete
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
        {currentLocations.length > 0 && (
          <button onClick={downloadAsKML}>download as kml</button>
        )}
      </div>

      <div style={{ display: "flex", flexDirection: "column" }}>
        <p>search for locations</p>
        <input onChange={onSearch} value={search} />
        {searchResults.length > 0 && (
          <div>
            <p>search results</p>

            {searchResults.map((result) => (
              <ul>
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
              </ul>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default KMLEditor;
