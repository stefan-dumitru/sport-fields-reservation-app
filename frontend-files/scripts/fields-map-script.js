let map;
let allMarkers = [];
let userMarker;
let userLocation;

function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        center: { lat: 44.4268, lng: 26.1025 },
        zoom: 12,
    });

    showUserLocation();
        
    fetch("http://localhost:3000/get-sports-fields")
        .then((response) => response.json())
        .then(async (fields) => {
            populateFieldSelector(fields);
        
            for (const field of fields) {
                const address = field.adresa;
        
                try {
                    const response = await fetch(
                        `http://localhost:3000/get-coordinates?address=${encodeURIComponent(address)}`
                    );
                    const data = await response.json();
        
                    if (data.success) {
                        const marker = new google.maps.Marker({
                            position: { lat: data.lat, lng: data.lng },
                            map: map,
                            title: field.denumire_teren,
                            visible: false
                        });
                        marker.fieldId = field.id_teren;
                        marker.address = address;

                        allMarkers.push(marker);

                        marker.addListener("click", () => {
                            if (userLocation) {
                                const distance = getDistance(
                                    userLocation.lat,
                                    userLocation.lng,
                                    marker.getPosition().lat(),
                                    marker.getPosition().lng()
                                );

                                const infoWindow = new google.maps.InfoWindow({
                                    content: `<b>${marker.title}</b><br>Distanta: ${distance.toFixed(2)} km`,
                                });

                                infoWindow.open(map, marker);
                            }
                        });
                    } else {
                        console.warn(`Could not fetch coordinates for: ${address}`);
                    }
                } catch (error) {
                    console.error(`Error fetching coordinates for: ${address}`, error);
                }
            }

            google.maps.event.addListener(map, 'bounds_changed', () => {
                checkMarkerVisibility();
            });

            google.maps.event.addListener(map, 'zoom_changed', () => {
                checkMarkerVisibility();
            });
        })
        .catch((error) => {
            console.error("Error fetching sports fields:", error);
        });
}

function showUserLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };

                userMarker = new google.maps.Marker({
                    position: userLocation,
                    map: map,
                    title: "Locatia ta curenta",
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png",
                        scaledSize: new google.maps.Size(40, 40),
                    },
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: "<b>Locatia ta curenta</b>",
                });

                userMarker.addListener("click", () => {
                    infoWindow.open(map, userMarker);
                });

                map.setCenter(userLocation);
                map.setZoom(14);
            },
            () => {
                console.warn("Geolocation permission denied.");
            }
        );
    } else {
        console.warn("Geolocation is not supported by this browser.");
    }
}

function getDistance(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLng = ((lng2 - lng1) * Math.PI) / 180;

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
            Math.cos((lat2 * Math.PI) / 180) *
            Math.sin(dLng / 2) *
            Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function populateFieldSelector(fields) {
    const selector = document.getElementById("field-selector");
    fields.forEach((field) => {
        const option = document.createElement("option");
        option.value = field.id_teren;
        option.textContent = field.denumire_teren;
        selector.appendChild(option);
    });

    selector.addEventListener("change", (event) => {
        const selectedFieldId = event.target.value;
        handleFieldSelection(selectedFieldId);
    });
}

function handleFieldSelection(fieldId) {
    allMarkers.forEach((marker) => {
        marker.setVisible(false);
    });
    
    if (fieldId) {
        const selectedMarker = allMarkers.find((marker) => String(marker.fieldId) === String(fieldId));
            
        if (selectedMarker) {
            selectedMarker.setVisible(true);
            map.setCenter(selectedMarker.getPosition());
            map.setZoom(15);
        } else {
            console.warn("No marker found for the selected field ID:", fieldId);
        }
    } else {
        map.setCenter({ lat: 44.4268, lng: 26.1025 });
        map.setZoom(12);
    }
}

function checkMarkerVisibility() {
    const bounds = map.getBounds();
    allMarkers.forEach((marker) => {
        if (bounds.contains(marker.getPosition())) {
            marker.setVisible(true);
        } else {
            marker.setVisible(false);
        }
    });
}

window.onload = initMap;