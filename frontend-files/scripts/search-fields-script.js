let isDragging = false;
let startCell = null;
let selectedCells = [];

function addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
}

function isWithinSchedule(hour, schedule) {
    if (schedule === "non-stop") return true;

    const [start, end] = schedule.split(" - ").map((time) => parseInt(time.split(":")[0], 10));
    return hour >= start && hour < end;
}

function isReserved(startHour, reservations) {
    const startTime = parseInt(startHour.split(":")[0], 10);
    const endTime = startTime + 1;

    return reservations.some((res) => {
        const resStart = parseInt(res.ora_inceput.split(":")[0], 10);
        const resEnd = parseInt(res.ora_sfarsit.split(":")[0], 10);

        return startTime >= resStart && endTime <= resEnd;
    });
}

async function fetchFieldReservations(fieldId) {
    try {
        const response = await fetch(`http://localhost:3000/get-field-reservations/${fieldId}`);
        const data = await response.json();

        data.reservations.forEach(reservation => {
            const formattedDate = addHours(new Date(reservation.data_rezervare), 2).toISOString().split('T')[0];
            const startTime = new Date(reservation.ora_inceput).toTimeString().split(' ')[0];
            const endTime = new Date(reservation.ora_sfarsit).toTimeString().split(' ')[0];

            reservation.data_rezervare = formattedDate;
            reservation.ora_inceput = startTime;
            reservation.ora_sfarsit = endTime;
        });

        return data.success ? data.reservations : [];
    } catch (error) {
        console.error(`Error fetching reservations for field ${fieldId}:`, error);
        return [];
    }
}

document.getElementById("search-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const resultsBody = document.getElementById("results-body");
    resultsBody.innerHTML = "";

    const resultsHeader = document.getElementById("results-header");
    resultsHeader.innerHTML = "";

    const fieldDescriptions = document.getElementById("field-descriptions");
    fieldDescriptions.innerHTML = "";

    const headerRow = document.createElement("tr");
    const timeHeader = document.createElement("th");
    timeHeader.textContent = "Interval Orar";
    headerRow.appendChild(timeHeader);

    const sport = document.getElementById("sport").value;
    const sector = document.getElementById("sector").value;
    const selectedDate = document.getElementById('availability-date').value;

    let fields = [];
    try {
        const response = await fetch("http://localhost:3000/search-fields", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sport, sector }),
        });

        const data = await response.json();
        if (data.success && data.fields.length > 0) {
            fields = data.fields;

            fields.forEach((field) => {
                const fieldHeader = document.createElement("th");
                fieldHeader.textContent = `Field ${field.id_teren}`;
                // fieldHeader.textContent = `${field.denumire_teren}`;
                headerRow.appendChild(fieldHeader);
            });

            resultsHeader.appendChild(headerRow);
        } else {
            resultsBody.innerHTML = "<tr><td colspan='25'>No fields found matching the criteria.</td></tr>";
            return;
        }
    } catch (error) {
        console.error("Error fetching fields:", error);
        alert("An error occurred while searching. Please try again.");
        return;
    }

    const fieldReservations = await Promise.all(
        fields.map(async (field) => {
            const reservations = await fetchFieldReservations(field.id_teren);
            return { ...field, reservations };
        })
    );

    for (let i = 0; i < 24; i++) {
        const startHour = i.toString().padStart(2, "0");

        const endHour = (i + 1).toString().padStart(2, "0");

        const row = document.createElement("tr");
        const timeCell = document.createElement("td");
        timeCell.textContent = `${startHour}:00 - ${endHour}:00`;
        timeCell.setAttribute("data-time-cell", "true");
        row.appendChild(timeCell);

        fieldReservations.forEach((field) => {
            const cell = document.createElement("td");
            const hourString = `${startHour}:00`;
            const reservationsForDate = field.reservations.filter(
                (r) => r.data_rezervare === selectedDate
            );
        
            cell.setAttribute("data-hour", startHour);
            cell.setAttribute("data-field-id", field.id_teren);
        
            if (isWithinSchedule(i, field.program)) {
                if (isReserved(hourString, reservationsForDate)) {
                    cell.style.backgroundColor = "red";

                    cell.addEventListener("mousemove", () => {
                        if (isDragging) {        
                            if (cell.style.backgroundColor === "red") {
                                isDragging = false;
                                alert("Dragging stopped due to invalid cell (reserved).");
                                selectedCells.forEach((c) => (c.style.backgroundColor = "green"));
                                selectedCells = [];
                            }
                        }
                    });
                } else {
                    cell.style.backgroundColor = "green";
        
                    cell.addEventListener("mousedown", () => {
                        if (cell.style.backgroundColor === "green") {
                            isDragging = true;
                            startCell = { cell, startHour, fieldId: field.id_teren };
                            selectedCells.push(cell);
                            cell.style.backgroundColor = "yellow";
                        }
                    });
        
                    cell.addEventListener("mousemove", () => {
                        if (isDragging) {
                            const currentFieldId = cell.getAttribute("data-field-id");
        
                            if (parseInt(currentFieldId) !== startCell.fieldId) {
                                isDragging = false;
                                alert("You can only select cells from the same field.");
                                selectedCells.forEach((c) => (c.style.backgroundColor = "green"));
                                selectedCells = [];
                                return;
                            }
        
                            if (cell.style.backgroundColor === "green" && !selectedCells.includes(cell)) {
                                selectedCells.push(cell);
                                cell.style.backgroundColor = "yellow";
                            }
                        }
                    });
        
                    cell.addEventListener("mouseup", async () => {
                        if (isDragging) {
                            isDragging = false;
        
                            const endCell = selectedCells[selectedCells.length - 1];
                            const startHour = startCell.startHour;
                            const endHour = endCell.dataset.hour;
        
                            const confirmReservation = confirm(
                                `Do you want to reserve from ${startHour}:00 to ${parseInt(endHour) + 1}:00?`
                            );
        
                            if (confirmReservation) {
                                const username = localStorage.getItem("username");
                                const reservationDetails = {
                                    id_teren: field.id_teren,
                                    data_rezervare: selectedDate,
                                    ora_inceput: `${startHour}:00`,
                                    ora_sfarsit: `${parseInt(endHour) + 1}:00`,
                                    username,
                                };
        
                                try {
                                    const response = await fetch(
                                        "http://localhost:3000/make-reservation",
                                        {
                                            method: "POST",
                                            headers: { "Content-Type": "application/json" },
                                            body: JSON.stringify(reservationDetails),
                                        }
                                    );
        
                                    const result = await response.json();
                                    if (result.success) {
                                        alert("Reservation made successfully!");
                                        selectedCells.forEach(
                                            (c) => (c.style.backgroundColor = "red")
                                        );
                                        location.reload();
                                    } else {
                                        alert(result.message || "Failed to make reservation.");
                                        selectedCells.forEach(
                                            (c) => (c.style.backgroundColor = "green")
                                        );
                                    }
                                } catch (error) {
                                    console.error("Error making reservation:", error);
                                    alert("An error occurred while making the reservation.");
                                    selectedCells.forEach(
                                        (c) => (c.style.backgroundColor = "green")
                                    );
                                }
                            } else {
                                selectedCells.forEach(
                                    (c) => (c.style.backgroundColor = "green")
                                );
                            }
        
                            selectedCells = [];
                            startCell = null;
                        }
                    });
                }
            } else {
                cell.style.backgroundColor = "gray";

                cell.addEventListener("mousemove", () => {
                    if (isDragging) {        
                        if (cell.style.backgroundColor === "gray") {
                            isDragging = false;
                            alert("Dragging stopped due to invalid cell (closed).");
                            selectedCells.forEach((c) => (c.style.backgroundColor = "green"));
                            selectedCells = [];
                        }
                    }
                });
            }
        
            row.appendChild(cell);
        });        

        resultsBody.appendChild(row);
    }

    fields.forEach((field) => {
        const description = document.createElement("p");
        description.textContent = `Field ${field.id_teren}: ${field.denumire_teren}, ${field.adresa}, ${field.pret_ora} lei/ora`;
        fieldDescriptions.appendChild(description);
    });
});