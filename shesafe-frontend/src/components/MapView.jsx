import React, { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import axios from "axios";
import "leaflet/dist/leaflet.css";

const backend = "http://localhost:5000"; // backend URL

function MapView() {
  const [reports, setReports] = useState([]);
  const [redZones, setRedZones] = useState([]);
  const [danger, setDanger] = useState(false);
  const [sosActive, setSosActive] = useState(false);
  const [countdown, setCountdown] = useState(10);
  const countdownRef = useRef(null);
  const siren = useRef(new Audio("/siren.mp3"));

  const userPosition = [28.6139, 77.2090]; // (Delhi as default)

  // Fetch reports + red zones
  const fetchData = async () => {
    const reportsRes = await axios.get(`${backend}/api/reports`);
    const redZonesRes = await axios.get(`${backend}/api/redzones`);
    setReports(reportsRes.data);
    setRedZones(redZonesRes.data);
  };

  // Check user safety periodically
  useEffect(() => {
    fetchData();

    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${backend}/api/check-zone`, {
          params: { latitude: userPosition[0], longitude: userPosition[1] },
        });

        if (res.data.isRedZone && !sosActive) {
          triggerSOS();
        } else if (!res.data.isRedZone) {
          stopSOS();
        }
      } catch (err) {
        console.error("Error checking zone", err);
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [sosActive]);

  const triggerSOS = () => {
    setDanger(true);
    setSosActive(true);
    siren.current.play();

    setCountdown(10);
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(countdownRef.current);
          alert("🚨 SOS sent to Police & Emergency Contacts!");
          stopSOS();
          return 10;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const stopSOS = () => {
    clearInterval(countdownRef.current);
    siren.current.pause();
    siren.current.currentTime = 0;
    setSosActive(false);
    setDanger(false);
    setCountdown(10);
  };

  return (
    <div style={{ height: "100vh", width: "100%" }}>
      <MapContainer center={userPosition} zoom={13} style={{ height: "100%", width: "100%" }}>
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Reports */}
        {reports.map((r) => (
          <Marker
            key={r.id}
            position={[r.latitude, r.longitude]}
            icon={L.icon({
              iconUrl: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
              iconSize: [35, 35],
            })}
          >
            <Popup>
              <b>{r.userName}</b>
              <br />
              {r.description}
              <br />
              <small>{new Date(r.date).toLocaleString()}</small>
            </Popup>
          </Marker>
        ))}

        {/* Red Zones */}
        {redZones.map((z) => (
          <Circle
            key={z.id}
            center={[z.latitude, z.longitude]}
            radius={500}
            pathOptions={{ color: "red", fillColor: "#ff4d4d", fillOpacity: 0.4 }}
          >
            <Popup>
              <b>🚨 Red Zone</b>
              <br />
              Reports: {z.reportCount}
              <br />
              <small>{new Date(z.createdAt).toLocaleString()}</small>
            </Popup>
          </Circle>
        ))}
      </MapContainer>

      {/* SOS Overlay */}
      {sosActive && (
        <div className="sos-overlay">
          <h2>🚨 DANGER! You are in a Red Zone! 🚨</h2>
          <p>Sending SOS in {countdown} seconds...</p>
          <button onClick={stopSOS}>Cancel SOS Alert</button>
        </div>
      )}
    </div>
  );
}

export default MapView;
