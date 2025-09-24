document.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Trebuie sa fii logat mai intai!");
        window.location.href = "log-in-page.html";
        return;
    }

    try {
        const response = await fetch(`${BACKEND_URL}/get-user-profile/${username}`);
        const data = await response.json();

        if (data.success) {
            document.getElementById("username").textContent = data.user.username;
            document.getElementById("nume").textContent = data.user.nume;
            document.getElementById("prenume").textContent = data.user.prenume;
            document.getElementById("email").textContent = data.user.email;
            document.getElementById("sporturi_preferate").textContent = data.user.sporturi_preferate || "Nu ai ales niciun sport preferat.";

            const sports = (data.user.sporturi_preferate || "").split(", ");
            sports.forEach(sport => {
                const checkbox = document.getElementById(sport.toLowerCase());
                if (checkbox) checkbox.checked = true;
            });
        } else {
            alert(data.message);
        }
    } catch (error) {
        console.error("Error fetching profile data:", error);
    }
});

function showSportsModal() {
    const sportsModal = new bootstrap.Modal(document.getElementById('sportsModal'));
    sportsModal.show();
}

document.getElementById("save-sports").addEventListener("click", async () => {
    const checkboxes = document.querySelectorAll(".sport-checkbox");
    const favouriteSports = [];

    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            favouriteSports.push(checkbox.value);
        }
    });

    const favouriteSportsString = favouriteSports.join(", ");

    const username = localStorage.getItem("username");
    try {
        const response = await fetch(`${BACKEND_URL}/update-favourite-sports/${username}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sporturi_preferate: favouriteSportsString }),
        });

        const data = await response.json();
        if (data.success) {
            alert("Lista de sporturi preferate a fost actualizata cu succes!");
            location.reload();
        } else {
            alert(data.message || "Nu s-a putut modifica lista sporturilor preferate. Incearca din nou.");
        }
    } catch (error) {
        console.error("Error updating favourite sports:", error);
        alert("A aparut o eroare. Incearca din nou.");
    }
});