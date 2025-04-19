let map;
let allMarkers = [];
let userMarker;
let userLocation;
let reservationPopup;

document.addEventListener("DOMContentLoaded", function () {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get("payment") === "success") {
        alert("Payment successful! Your reservation has been confirmed.");
    } else if (urlParams.get("payment") === "cancel") {
        alert("Payment canceled. You can still pay for the reservation by accessing the reservation history.");
    }
});

function addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
}

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
                        marker.schedule = field.program;
                        marker.pricePerHour = field.pret_ora;

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
                                    content: `
                                        <b>${marker.title}</b><br>
                                        Distanta: ${distance.toFixed(2)} km<br>
                                        <button onclick="showReservationPopup(${marker.fieldId})">Fa o rezervare</button>
                                    `,
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

function closeReservationPopup() {
    if (reservationPopup) {
        reservationPopup.style.display = "none";
    }
}

function showReservationPopup(fieldId) {
    const field = allMarkers.find(marker => marker.fieldId === fieldId);

    if (!field) {
        console.error("Field not found for ID:", fieldId);
        return;
    }

    if (!reservationPopup) {
        reservationPopup = document.createElement("div");
        reservationPopup.id = "reservation-popup";
        reservationPopup.style.position = "absolute";
        reservationPopup.style.backgroundColor = "white";
        reservationPopup.style.padding = "10px";
        reservationPopup.style.border = "1px solid black";
        reservationPopup.style.zIndex = "1000";
        reservationPopup.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
        reservationPopup.style.borderRadius = "8px";
        document.body.appendChild(reservationPopup);
    }
    
    reservationPopup.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
            <b>${field.title}</b>
            <button onclick="closeReservationPopup()" style="background: red; color: white; border: none; padding: 5px; cursor: pointer;">&times;</button>
        </div>
        <p>Adresa: ${field.address}</p>
        <p>Pret: ${field.pricePerHour} lei/ora</p>
        <label for='reservation-date'>Selecteaza data:</label>
        <input type='date' id='reservation-date'><br>
        <button onclick='fetchReservations(${field.fieldId})'>Verifica disponibilitatea</button>
        <div id='availability'></div>
    `;

    reservationPopup.style.left = "50%";
    reservationPopup.style.top = "50%";
    reservationPopup.style.transform = "translate(-50%, -50%)";
    reservationPopup.style.display = "block";
}

function closeAvailabilityPopup() {
    const popup = document.getElementById("availability-popup");
    if (popup) popup.style.display = "none";
}

let isDragging = false;
let startCell = null;
let selectedCells = [];

function addDragSelectionListeners(selectedDate, fieldPricePerHour) {
    const cells = document.querySelectorAll(".availability-cell");
    const table = document.querySelector("#availability-popup table");

    table.addEventListener("mousedown", function (event) {
        event.preventDefault();
    });

    cells.forEach(cell => {
        cell.addEventListener("mousedown", function (e) {
            if (cell.style.backgroundColor === "green") {
                isDragging = true;
                startCell = { cell, startHour: cell.dataset.hour, fieldId: cell.dataset.fieldId };
                selectedCells.push(cell);
                cell.style.backgroundColor = "yellow";
            }
        });

        cell.addEventListener("mousemove", function (e) {
            if (isDragging) {
                e.preventDefault();

                const currentFieldId = cell.getAttribute("data-field-id");

                if (parseInt(currentFieldId) !== parseInt(startCell.fieldId)) {
                    isDragging = false;
                    alert("You can only select cells from the same field.");
                    selectedCells.forEach(c => c.style.backgroundColor = "green");
                    selectedCells = [];
                    return;
                }

                if (cell.style.backgroundColor === "green" && !selectedCells.includes(cell)) {
                    if (selectedCells.length >= 3) { 
                        isDragging = false;
                        alert("You cannot make a reservation longer than 3 hours.");
                        selectedCells.forEach(c => c.style.backgroundColor = "green");
                        selectedCells = [];
                        return;
                    }
                    
                    selectedCells.push(cell);
                    cell.style.backgroundColor = "yellow";
                }

                if (cell.style.backgroundColor === "red" || cell.style.backgroundColor === "gray") {
                    isDragging = false;
                    alert("Dragging stopped due to invalid cell.");
                    selectedCells.forEach(c => c.style.backgroundColor = "green");
                    selectedCells = [];
                }
            }
        });

        cell.addEventListener("mouseup", async function () {
            if (isDragging) {
                isDragging = false;

                const endCell = selectedCells[selectedCells.length - 1];
                const startHour = startCell.startHour;
                const endHour = endCell.dataset.hour;
                const username = localStorage.getItem("username");
                const currentFieldId = cell.getAttribute("data-field-id");

                try {
                    const response = await fetch(`http://localhost:3000/get-user-reservations?username=${username}&date=${selectedDate}`);
                    const userReservations = await response.json();
        
                    if (userReservations.result.length >= 3) {
                        alert("You have reached the maximum of 3 reservations for this day.");
                        selectedCells.forEach((c) => (c.style.backgroundColor = "green"));
                        selectedCells = [];
                        return;
                    }
                } catch (error) {
                    console.error("Error fetching user reservations:", error);
                    alert("An error occurred while checking your reservations.");
                    return;
                }

                try {
                    const response = await fetch(`http://localhost:3000/get-user-reservations-for-field?username=${username}&date=${selectedDate}&fieldId=${currentFieldId}`);
                    const fieldReservations = await response.json();
                                
                    if (fieldReservations.result.length >= 1) {
                        alert("You can only make one reservation per field per day.");
                        selectedCells.forEach((c) => (c.style.backgroundColor = "green"));
                        selectedCells = [];
                        return;
                    }
                } catch (error) {
                    console.error("Error fetching user field reservations:", error);
                    alert("An error occurred while checking your reservations.");
                }

                const totalHours = selectedCells.length;
                const totalPrice = fieldPricePerHour * totalHours;

                const confirmReservation = confirm(
                    `Do you want to reserve from ${startHour}:00 to ${parseInt(endHour) + 1}:00?`
                );

                if (confirmReservation) {
                    const reservationDetails = {
                        id_teren: startCell.fieldId,
                        data_rezervare: selectedDate,
                        ora_inceput: `${startHour}:00`,
                        ora_sfarsit: `${parseInt(endHour) + 1}:00`,
                        username,
                    };

                    try {
                        const response = await fetch("http://localhost:3000/make-reservation", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify(reservationDetails),
                        });

                        const result = await response.json();
                        if (result.success) {
                            alert("Reservation made successfully!");

                            try {
                                const paymentResponse = await fetch("http://localhost:3000/create-checkout-session", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({
                                        id_teren: currentFieldId,
                                        data_rezervare: selectedDate,
                                        ora_inceput: `${startHour}:00`,
                                        ora_sfarsit: `${parseInt(endHour) + 1}:00`,
                                        username,
                                        totalPrice
                                    }),
                                });
        
                                const paymentData = await paymentResponse.json();
        
                                if (paymentData.url) {
                                    window.location.href = paymentData.url;
                                } else {
                                    alert("Error processing payment. Please try again.");
                                    selectedCells.forEach(c => c.style.backgroundColor = "green");
                                }
                            } catch (error) {
                                console.error("Error processing payment:", error);
                                alert("An error occurred while processing the payment.");
                                selectedCells.forEach(c => c.style.backgroundColor = "green");
                            }

                            selectedCells.forEach(c => c.style.backgroundColor = "red");
                        } else {
                            alert(result.message || "Failed to make reservation.");
                            selectedCells.forEach(c => c.style.backgroundColor = "green");
                        }
                    } catch (error) {
                        console.error("Error making reservation:", error);
                        alert("An error occurred while making the reservation.");
                        selectedCells.forEach(c => c.style.backgroundColor = "green");
                    }
                } else {
                    selectedCells.forEach(c => c.style.backgroundColor = "green");
                }

                selectedCells = [];
                startCell = null;
            }
        });
    });
}

function displayAvailability(reservations, selectedDate, fieldSchedule, fieldId, fieldPricePerHour) {
    let openHour = 0, closeHour = 24;

    if (fieldSchedule !== "non-stop") {
        const [openStr, closeStr] = fieldSchedule.split(" - ");
        openHour = parseInt(openStr.split(":")[0], 10);
        closeHour = parseInt(closeStr.split(":")[0], 10);
    }

    let availabilityPopup = document.getElementById("availability-popup");
    if (!availabilityPopup) {
        availabilityPopup = document.createElement("div");
        availabilityPopup.id = "availability-popup";
        availabilityPopup.style.position = "absolute";
        availabilityPopup.style.backgroundColor = "white";
        availabilityPopup.style.padding = "15px";
        availabilityPopup.style.border = "1px solid black";
        availabilityPopup.style.zIndex = "1000";
        availabilityPopup.style.boxShadow = "0px 4px 6px rgba(0,0,0,0.1)";
        availabilityPopup.style.borderRadius = "8px";
        availabilityPopup.style.maxWidth = "400px";
        document.body.appendChild(availabilityPopup);
    }

    let tableHTML = `
        <table border="1" style="width: 100%; border-collapse: collapse; text-align: center;">
            <tr>
                <th>Interval Orar</th>
                <th>Field</th>
            </tr>
    `;

    reservations.forEach(res => {
        const formattedDate = addHours(new Date(res.data_rezervare), 3).toISOString().split('T')[0];
        const startTime = new Date(res.ora_inceput).toTimeString().split(' ')[0];
        const endTime = new Date(res.ora_sfarsit).toTimeString().split(' ')[0];

        res.data_rezervare = formattedDate;
        res.ora_inceput = startTime;
        res.ora_sfarsit = endTime;
    });

    for (let hour = 0; hour < 24; hour++) {
        const startTime = hour.toString().padStart(2, "0") + ":00";
        const endTime = (hour + 1).toString().padStart(2, "0") + ":00";
        let cellColor = "gray";

        if (hour >= openHour && hour < closeHour) {
            cellColor = "green";

            reservations.forEach(res => {
                if (res.data_rezervare === selectedDate) {
                    const startRes = parseInt(res.ora_inceput.split(":")[0], 10);
                    const endRes = parseInt(res.ora_sfarsit.split(":")[0], 10);
                    if (hour >= startRes && hour < endRes) {
                        cellColor = "red";
                    }
                }
            });
        }

        tableHTML += `
            <tr>
                <td>${startTime} - ${endTime}</td>
                <td class="availability-cell" 
                    data-hour="${hour}" 
                    data-field-id="${fieldId}" 
                    style="background-color: ${cellColor}; color: white;">
                    ${cellColor === "red" ? "Rezervat" : cellColor === "gray" ? "Inchis" : "Disponibil"}
                </td>
            </tr>
        `;
    }

    tableHTML += "</table>";

    availabilityPopup.innerHTML = `
        <div style="display: flex; justify-content: space-between;">
            <b>Disponibilitate pentru ${selectedDate}</b>
            <button onclick="closeAvailabilityPopup()" style="background: red; color: white; border: none; padding: 5px; cursor: pointer;">&times;</button>
        </div>
        ${tableHTML}
    `;

    availabilityPopup.style.left = "50%";
    availabilityPopup.style.top = "50%";
    availabilityPopup.style.transform = "translate(-50%, -50%)";
    availabilityPopup.style.display = "block";

    addDragSelectionListeners(selectedDate, fieldPricePerHour);
}

function fetchReservations(id_teren) {
    const selectedDate = document.getElementById("reservation-date").value;
    if (!selectedDate) {
        alert("Selecteaza o data!");
        return;
    }

    const field = allMarkers.find(marker => marker.fieldId === id_teren);
    if (!field) {
        console.error("Field not found for ID:", id_teren);
        return;
    }

    fetch(`http://localhost:3000/get-field-reservations/${id_teren}`)
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const reservations = data.reservations;
                displayAvailability(reservations, selectedDate, field.schedule, field.fieldId, field.pricePerHour);
            } else {
                alert("Eroare la preluarea rezervarilor.");
            }
        })
        .catch(error => console.error("Error fetching reservations:", error));
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