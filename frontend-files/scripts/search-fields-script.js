function addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
}

document.getElementById("search-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const sport = document.getElementById("sport").value;
    const price = document.getElementById("price").value;
    const startTime = document.getElementById("start-time").value;
    const endTime = document.getElementById("end-time").value;

    if (startTime && endTime && startTime >= endTime) {
        alert("Start time must be earlier than end time!");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/search-fields", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sport, price, startTime, endTime }),
        });

        const data = await response.json();
        const tbody = document.getElementById("results-body");
        tbody.innerHTML = "";

        if (data.success && data.fields.length > 0) {
            data.fields.forEach((field) => {
                const row = document.createElement("tr");

                row.innerHTML = `
                    <td>${field.denumire_sport}</td>
                    <td>${field.adresa}</td>
                    <td>${field.pret_ora}</td>
                    <td>${field.denumire_teren}</td>
                    <td>
                        <button class="make-reservation-btn" 
                                data-field-id="${field.id_teren}" 
                                data-schedule="${field.program}">
                            Rezerva
                        </button>
                    </td>
                `;

                tbody.appendChild(row);
            });

            document.querySelectorAll(".make-reservation-btn").forEach((button) => {
                button.addEventListener("click", async () => {
                    const modal = document.getElementById("reservation-modal");
                    const scheduleDisplay = document.getElementById("field-schedule");
                    const reservationsList = document.createElement("ul");
            
                    selectedFieldId = button.dataset.fieldId;
                    selectedFieldSchedule = button.dataset.schedule;

                    try {
                        const id_teren = selectedFieldId;
                        const response = await fetch(`http://localhost:3000/get-field-reservations/${id_teren}`);

                        scheduleDisplay.textContent = `Programul terenului: ${selectedFieldSchedule}`;
            
                        const result = await response.json();
            
                        if (result.success && result.reservations.length > 0) {
                            reservationsList.innerHTML = "<strong>Rezervari existente:</strong>";
            
                            result.reservations.forEach((reservation) => {
                                const formattedDate = addHours(new Date(reservation.data_rezervare), 2).toISOString().split('T')[0];
                                const startTime = new Date(reservation.ora_inceput).toTimeString().split(' ')[0];
                                const endTime = new Date(reservation.ora_sfarsit).toTimeString().split(' ')[0];

                                const listItem = document.createElement("li");
                                listItem.textContent = `Data: ${formattedDate}, Interval: ${startTime} - ${endTime}`;
                                reservationsList.appendChild(listItem);
                            });
                        } else {
                            reservationsList.innerHTML = "<strong>No future reservations available for this field.</strong>";
                        }
            
                        scheduleDisplay.appendChild(reservationsList);
                    } catch (error) {
                        console.error("Error fetching reservations:", error);
                        scheduleDisplay.textContent = "An error occurred while fetching reservations.";
                    }
            
                    modal.style.display = "block";
                });
            });            
        } else {
            tbody.innerHTML = "<tr><td colspan='7'>No fields found matching the criteria.</td></tr>";
        }
    } catch (error) {
        console.error("Error searching fields:", error);
        alert("An error occurred while searching. Please try again.");
    }
});

document.querySelector(".close-modal").addEventListener("click", () => {
    document.getElementById("reservation-modal").style.display = "none";
});

document.getElementById("reservation-form").addEventListener("submit", async (event) => {
    event.preventDefault();

    const date = document.getElementById("reservation-date").value;
    const startTime = document.getElementById("reservation-start-time").value;
    const endTime = document.getElementById("reservation-end-time").value;
    const username = localStorage.getItem("username");

    if (!date || !startTime || !endTime) {
        alert("Please fill in all fields!");
        return;
    }

    const reservationDate = new Date(date);
    if (isNaN(reservationDate.getTime())) {
        alert("Invalid date format. Please use a valid date.");
        return;
    }

    const formattedDate = reservationDate.toISOString().split("T")[0];

    if (
        selectedFieldSchedule !== "non-stop" &&
        (startTime < selectedFieldSchedule.split(" - ")[0] ||
            endTime > selectedFieldSchedule.split(" - ")[1])
    ) {
        alert("Rezervarea nu respecta programul disponibil! Incearca din nou.");
        return;
    }

    try {
        const response = await fetch("http://localhost:3000/make-reservation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                id_teren: selectedFieldId,
                data_rezervare: formattedDate,
                ora_inceput: `${date} ${startTime}:00`,
                ora_sfarsit: `${date} ${endTime}:00`,
                username
            }),
        });

        const result = await response.json();
        if (result.success) {
            alert("Rezervarea a fost facuta cu succes!");
            location.reload();
        } else {
            alert(result.message || "An error occurred. Please try again.");
        }
    } catch (error) {
        console.error("Error making reservation:", error);
        alert("An error occurred. Please try again.");
    }
});

window.onclick = (event) => {
    const modal = document.getElementById("reservation-modal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};