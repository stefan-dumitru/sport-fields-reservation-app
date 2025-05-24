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
            const formattedDate = addHours(new Date(reservation.data_rezervare), 3).toISOString().split('T')[0];
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

    const selectedDate = document.getElementById('availability-date').value;

    let fields = [];
    try {
        const response = await fetch("http://localhost:3000/get-owner-fields", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: localStorage.getItem("username") })
        });

        const data = await response.json();
        if (data.success && data.fields.length > 0) {
            fields = data.fields;

            fields.forEach((field) => {
                const fieldHeader = document.createElement("th");
                fieldHeader.textContent = `Field ${field.id_teren}`;
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
                } else {
                    cell.style.backgroundColor = "green";
                }
            } else {
                cell.style.backgroundColor = "gray";
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