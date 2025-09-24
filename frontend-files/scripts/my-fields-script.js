document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem('username');
    if (!username) {
        alert("Trebuie sa fii logat mai intai!");
        window.location.href = 'login.html';
        return;
    }

    fetchMyFields(username);
});

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

async function fetchMyFields(username) {
    try {
        const response = await fetch(`${BACKEND_URL}/get-owner-sports-fields/${username}`);
        const fields = await response.json();

        const tableBody = document.getElementById('pending-fields-body');
        tableBody.innerHTML = "";

        fields.forEach(field => {
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${field.denumire_teren}</td>
                <td>${field.denumire_sport}</td>
                <td>${field.adresa}</td>
                <td><input type="number" min="0" value="${field.pret_ora}" class="form-control price-input" /></td>
                <td><input type="text" value="${field.program}" class="form-control schedule-input" /></td>
                <td>
                    <button class="btn btn-primary me-2" onclick="saveField(${field.id_teren}, this)">Salveaza</button>
                    <button class="btn btn-danger" onclick="deleteField(${field.id_teren})">Sterge teren</button>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error fetching fields:', error);
        alert("Terenurile tale nu au putut fi incarcate. Incearca din nou.");
    }
}

async function saveField(id_teren, button) {
    const row = button.closest('tr');
    const price = row.querySelector('.price-input').value;
    const schedule = row.querySelector('.schedule-input').value;

    try {
        const response = await fetch(`${BACKEND_URL}/update-field`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_teren, pret_ora: price, program: schedule })
        });

        const result = await response.json();

        if (result.success) {
            alert("Datele terenului au fost modificate cu succes!");
        } else {
            alert("Datele terenului nu au fost modificate! Incearca din nou.");
        }
    } catch (error) {
        console.error('Error updating field:', error);
        alert("A aparut o eroare. Incearca din nou.");
    }
}

async function deleteField(id_teren) {
    const confirmDelete = confirm("Esti sigur ca vrei sa stergi acest teren?");
    if (!confirmDelete) return;

    try {
        const response = await fetch(`${BACKEND_URL}/delete-field/${id_teren}`, {
            method: 'DELETE'
        });

        const result = await response.json();

        if (result.success) {
            alert("Teren sters cu succes.");
            const username = localStorage.getItem('username');
            fetchMyFields(username);
        } else {
            alert("Terenul nu a putut fi sters. Incearca din nou.");
        }
    } catch (error) {
        console.error('Error deleting field:', error);
        alert("A aparut o eroare la stergerea terenului. Incearca din nou.");
    }
}