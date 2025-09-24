async function getBackendUrl() {
    try {
        let backendBaseUrl = "";

        if (window.location.hostname.includes("rezervareteren.up.railway.app")) {
            backendBaseUrl = "https://backend-production-47d1.up.railway.app";
        }

        const response = await fetch(`${backendBaseUrl}/get-backend-route`);
        if (!response.ok) {
            throw new Error(`Failed to fetch backend URL: ${response.status}`);
        }

        const data = await response.json();
        return data.backendUrl;
    } catch (error) {
        console.error("Error fetching backend URL:", error);
        return null;
    }
}

const BACKEND_URL = await getBackendUrl();

function addHours(date, hours) {
    const newDate = new Date(date);
    newDate.setHours(newDate.getHours() + hours);
    return newDate;
}

document.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Trebuie sa fii logat mai intai!");
        window.location.href = "log-in-page.html";
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/get-reservations/${username}`);
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

                const fullStartDate = new Date(reservation.ora_inceput);
                const isFuture = fullStartDate > new Date();

                row.innerHTML = `
                    <td>${reservation.id_rezervare}</td>
                    <td>${reservation.denumire_teren}</td>
                    <td>${formattedDate}</td>
                    <td>${startTime}</td>
                    <td>${endTime}</td>
                    <td>
                        <button class="btn btn-danger cancel-btn" ${!isFuture ? "disabled title='Nu se poate anula o rezervare trecuta'" : ""}>Anuleaza</button>
                    </td>
                `;
                tbody.appendChild(row);

                if (isFuture) {
                    row.querySelector(".cancel-btn").addEventListener("click", async () => {
                        const confirmCancel = confirm("Esti sigur ca vrei sa anulezi rezervarea?");
                        if (confirmCancel) {
                            try {
                                const cancelResponse = await fetch(
                                    `${BACKEND_URL}/cancel-reservation/${reservation.id_rezervare}`,
                                    { method: "DELETE" }
                                );
                                const cancelData = await cancelResponse.json();
                                if (cancelData.success) {
                                    alert("Rezervarea a fost anulata cu succes!");
                                    row.remove();
                                } else {
                                    alert("A aparut o eroare. Incearca din nou.");
                                }
                            } catch (error) {
                                console.error("Error canceling reservation:", error);
                            }
                        }
                    });
                }
            });
        } else {
            alert(data.message || "Nu s-a gasit nicio rezervare.");
        }
    } catch (error) {
        console.error("Error fetching reservations:", error);
        const tbody = document.getElementById("reservations-body");
        tbody.innerHTML = `<tr><td colspan="6" class="text-center text-danger">Error loading data.</td></tr>`;
    }
});