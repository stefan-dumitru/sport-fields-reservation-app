document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem('username');
    if (!username) {
        alert('Not logged in.');
        window.location.href = 'login.html';
        return;
    }

    fetchMyFields(username);
});

async function fetchMyFields(username) {
    try {
        const response = await fetch(`http://sport-fields-reservation-app-production.up.railway.app/get-owner-sports-fields/${username}`);
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
                    <button class="btn btn-primary" onclick="saveField(${field.id_teren}, this)">Salveaza</button>
                </td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {
        console.error('Error fetching fields:', error);
        alert('Failed to load your fields.');
    }
}

async function saveField(id_teren, button) {
    const row = button.closest('tr');
    const price = row.querySelector('.price-input').value;
    const schedule = row.querySelector('.schedule-input').value;

    try {
        const response = await fetch('http://localhost:3000/update-field', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id_teren, pret_ora: price, program: schedule })
        });

        const result = await response.json();

        if (result.success) {
            alert('Field updated successfully!');
        } else {
            alert('Failed to update field.');
        }
    } catch (error) {
        console.error('Error updating field:', error);
        alert('An error occurred while updating.');
    }
}