function addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
}

document.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("You must log in first!");
        window.location.href = "log-in-page.html";
        return;
    }

    try {
        const response = await fetch(`http://sport-fields-reservation-app-production.up.railway.app/get-reservations/${username}`);
        const data = await response.json();

        if (data.success && Array.isArray(data.reservations)) {
            const tbody = document.getElementById("reservations-body");

            if (data.reservations.length === 0) {
                tbody.innerHTML = `<tr><td colspan="6" class="text-center">Momentan nu ai facut nicio rezervare.</td></tr>`;
                return;
            }

            data.reservations.forEach(reservation => {
                const formattedDate = addHours(new Date(reservation.data_rezervare), 3).toISOString().split('T')[0];
                const startTime = new Date(reservation.ora_inceput).toTimeString().split(' ')[0];
                const endTime = new Date(reservation.ora_sfarsit).toTimeString().split(' ')[0];

                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${reservation.id_rezervare}</td>
                    <td>${reservation.denumire_teren}</td>
                    <td>${formattedDate}</td>
                    <td>${startTime}</td>
                    <td>${endTime}</td>
                    <td>
                        <button class="btn btn-danger cancel-btn">Anuleaza</button>
                    </td>
                `;
                tbody.appendChild(row);

                row.querySelector(".cancel-btn").addEventListener("click", async () => {
                    const confirmCancel = confirm("Esti sigur ca vrei sa anulezi rezervarea?");
                    if (confirmCancel) {
                        try {
                            const cancelResponse = await fetch(
                                `http://sport-fields-reservation-app-production.up.railway.app/cancel-reservation/${reservation.id_rezervare}`,
                                { method: "DELETE" }
                            );
                            const cancelData = await cancelResponse.json();
                            if (cancelData.success) {
                                alert("Rezervarea a fost anulata cu succes!");
                                row.remove();
                            } else {
                                alert("Error canceling reservation. Please try again.");
                            }
                        } catch (error) {
                            console.error("Error canceling reservation:", error);
                        }
                    }
                });
            });
        } else {
            alert(data.message || "No reservations found.");
        }
    } catch (error) {
        console.error("Error fetching reservations:", error);
        const tbody = document.getElementById("reservations-body");
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading data.</td></tr>`;
    }
});