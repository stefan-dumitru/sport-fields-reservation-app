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

document.addEventListener("DOMContentLoaded", () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("Trebuie sa fii logat mai intai!");
        window.location.href = "log-in-page.html";
        return;
    }

    const form = document.getElementById("addFieldForm");
    form.addEventListener("submit", async (event) => {
        event.preventDefault();

        const denumireSport = document.getElementById("denumireSport").value;
        const adresa = document.getElementById("adresa").value;
        const pretOra = document.getElementById("pretOra").value;
        const denumireTeren = document.getElementById("denumireTeren").value;
        const program = document.getElementById("program").value;
        const sector = document.getElementById("sector").value;

        try {
            const response = await fetch(`${BACKEND_URL}/add-field`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ username, denumire_sport: denumireSport, adresa, pret_ora: pretOra, denumire_teren: denumireTeren, program, sector })
            });

            const data = await response.json();
            if (data.success) {
                alert(data.message);
                form.reset();
            } else {
                alert(data.message || "A aparut o eroare. Incearca din nou");
            }
        } catch (error) {
            console.error("Error adding field:", error);
            alert("Terenul nu a putut fi adaugat. Incearca din nou.");
        }
    });
});