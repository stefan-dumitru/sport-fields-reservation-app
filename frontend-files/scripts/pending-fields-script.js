document.addEventListener("DOMContentLoaded", async () => {
    const username = localStorage.getItem("username");
    if (!username) {
        alert("You must log in first!");
        window.location.href = "login.html";
        return;
    }

    try {
        const userResponse = await fetch(`http://localhost:3000/user-status/${username}`);
        const userData = await userResponse.json();
        let isTrusted = false;
        if (userData.success) {
            isTrusted = userData.statut === 1;
        }

        const response = await fetch("http://localhost:3000/pending-fields");
        const data = await response.json();

        if (data.success) {
            const tbody = document.getElementById("pending-fields-body");

            if (data.fields.length === 0) {
                tbody.innerHTML = `<tr><td colspan="8" class="text-center">Nu exista terenuri aflate in asteptare</td></tr>`;
                return;
            }

            data.fields.forEach(field => {
                const row = document.createElement("tr");
                row.innerHTML = `
                    <td>${field.id_teren}</td>
                    <td>${field.denumire_sport}</td>
                    <td>${field.adresa}</td>
                    <td>${field.pret_ora}</td>
                    <td>${field.denumire_teren}</td>
                    <td>${field.program}</td>
                    <td>${field.sector}</td>
                    <td>
                        <button class="btn btn-success confirm-btn" ${isTrusted ? "" : "disabled"}>
                            Confirma teren
                        </button>
                    </td>
                    <td>
                        <button class="btn btn-danger reject-btn" ${isTrusted ? "" : "disabled"}>
                            Respinge teren
                        </button>
                    </td>
                `;
                tbody.appendChild(row);

                row.querySelector(".confirm-btn").addEventListener("click", async () => {
                    const userConfirmed = confirm("Esti sigur ca vrei sa confirmi acest teren?");
                    if (userConfirmed) {
                        try {
                            const confirmResponse = await fetch(
                                `http://localhost:3000/confirm-field/${field.id_teren}`,
                                { method: "PUT" }
                            );
                            const confirmData = await confirmResponse.json();
                            if (confirmData.success) {
                                alert("Terenul a fost confirmat cu succes!");
                                row.remove();
                            } else {
                                alert("Error confirming the field. Please try again.");
                            }
                        } catch (error) {
                            console.error("Error confirming field:", error);
                        }
                    }
                });

                row.querySelector(".reject-btn").addEventListener("click", async () => {
                    const userRejected = confirm("Esti sigur ca vrei sa respingi acest teren?");
                    if (userRejected) {
                        try {
                            const rejectResponse = await fetch(
                                `http://localhost:3000/reject-field/${field.id_teren}`,
                                { method: "DELETE" }
                            );
                            const rejectData = await rejectResponse.json();
                            if (rejectData.success) {
                                alert("Terenul a fost respins cu succes!");
                                row.remove();
                            } else {
                                alert("Error rejecting the field. Please try again.");
                            }
                        } catch (error) {
                            console.error("Error rejecting field:", error);
                        }
                    }
                });
            });
        } else {
            alert("No fields pending confirmation or error occurred.");
        }
    } catch (error) {
        console.error("Error fetching pending fields:", error);
    }
});