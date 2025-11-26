import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./index.css";

export default function App() {
  const mapRef = useRef(null);
  const sirenRef = useRef(null);
  const [sosState, setSosState] = useState("idle");
  const [countdown, setCountdown] = useState(10);
  const [sosVisible, setSosVisible] = useState(false);
  const countdownTimer = useRef(null);

  // Initialize map
  useEffect(() => {
    const map = L.map("map").setView([28.6139, 77.2090], 13);
    mapRef.current = map;

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "@ OpenStreetMap",
    }).addTo(map);

    loadReports();
    loadRedZones();
    simulateUser(map);
  }, []);

  // --- Backend: Load all reports
  async function loadReports() {
    const res = await fetch("http://localhost:5000/api/reports");
    const data = await res.json();

    data.forEach((r) => {
      L.marker([r.latitude, r.longitude])
        .addTo(mapRef.current)
        .bindPopup(`<b>${r.userName}</b><br>${r.description}`);
    });
  }

  // --- Backend: Load red zones
  async function loadRedZones() {
    const res = await fetch("http://localhost:5000/api/redzones");
    const zones = await res.json();

    zones.forEach((z) => {
      L.circle([z.latitude, z.longitude], {
        radius: 500,
        color: "red",
        fillColor: "#f03",
        fillOpacity: 0.4,
      })
        .addTo(mapRef.current)
        .bindPopup(`<b>🚨 Red Zone</b><br>Reports: ${z.reportCount}`);
    });
  }

  // --- Simulate user + red zone detection
  function simulateUser(map) {
    const userMarker = L.marker([28.6139, 77.2090], {
      icon: L.icon({
        iconUrl: "https://cdn-icons-png.flaticon.com/512/1077/1077012.png",
        iconSize: [35, 35],
      }),
    }).addTo(map);

    setInterval(async () => {
      const lat = userMarker.getLatLng().lat;
      const lon = userMarker.getLatLng().lng;

      const res = await fetch(
        `http://localhost:5000/api/check-zone?latitude=${lat}&longitude=${lon}`
      );
      const data = await res.json();

      if (data.isRedZone && sosState === "idle") {
        triggerSOS();
      } else if (!data.isRedZone && sosState !== "idle") {
        stopSOS();
      }
    }, 5000);
  }

  // --- Trigger SOS alert
  function triggerSOS() {
    setSosState("countdown");
    setSosVisible(true);
    sirenRef.current.play();
    let secondsLeft = 10;
    setCountdown(secondsLeft);

    countdownTimer.current = setInterval(() => {
      secondsLeft -= 1;
      setCountdown(secondsLeft);

      if (secondsLeft <= 0) {
        clearInterval(countdownTimer.current);
        sendSOS();
      }
    }, 1000);
  }

  // --- Send SOS to authorities (fake stage)
  function sendSOS() {
    setSosState("sent");
    setSosVisible(true);
    sirenRef.current.pause();
    sirenRef.current.currentTime = 0;

    setTimeout(() => {
      alert("🚨 SOS sent successfully to police!");
      stopSOS();
    }, 3000);
  }

  // --- Cancel SOS
  function cancelSOS() {
    clearInterval(countdownTimer.current);
    stopSOS();
    alert("✅ SOS alert cancelled.");
  }

  // --- Stop siren and reset
  function stopSOS() {
    setSosState("idle");
    setSosVisible(false);
    sirenRef.current.pause();
    sirenRef.current.currentTime = 0;
    setCountdown(10);
  }

  return (
    <div>
      <div className="info-box">
        <h3>🛡️ SheSafe - Women’s Safety Map</h3>
        <p>🟢 Safe | 🔴 Red Zone | 📍 Click map to report</p>
      </div>

      <div id="map"></div>

      {sosVisible && (
        <div id="sos-alert">
          <h2>🚨 DANGER! You are in a Red Zone!</h2>
          <p>
            Sending SOS in <span>{countdown}</span> seconds...
          </p>
          <button id="cancel-btn" onClick={cancelSOS}>
            Cancel SOS Alert
          </button>
        </div>
      )}

      <audio ref={sirenRef} src="/siren.mp3" loop />
    </div>
  );
}
