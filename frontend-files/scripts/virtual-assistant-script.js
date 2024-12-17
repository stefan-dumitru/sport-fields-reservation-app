const form = document.getElementById('training-form');
const chatbox = document.getElementById('chatbox');

form.addEventListener('submit', (e) => {
    e.preventDefault();

    const sport = document.getElementById('sport').value;
    const experience = document.getElementById('experience').value;
    const age = document.getElementById('age').value;

    const userMessage = document.createElement('div');
    userMessage.className = 'user-message';
    userMessage.textContent = `Sport: ${sport}, Nivel de experienta: ${experience}, Varsta: ${age}`;
    chatbox.appendChild(userMessage);

    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'assistant-message';
    typingIndicator.textContent = 'Connecting...';
    chatbox.appendChild(typingIndicator);
    chatbox.scrollTop = chatbox.scrollHeight;

    const eventSource = new EventSource(`http://localhost:3000/get-training-plan?sport=${sport}&experience=${experience}&age=${age}`);

    eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);

        if (data.message) {
            typingIndicator.textContent = data.message;
        } else if (data.success && data.trainingPlan) {
            chatbox.removeChild(typingIndicator);
            renderTrainingPlan(data.trainingPlan);
            eventSource.close();
        } else {
            chatbox.removeChild(typingIndicator);
            const errorMessage = document.createElement('div');
            errorMessage.className = 'assistant-message';
            errorMessage.textContent = data.message || 'Scuze, nu pot genera un program de antrenament acum.';
            chatbox.appendChild(errorMessage);
            eventSource.close();
        }
    };

    eventSource.onerror = () => {
        chatbox.removeChild(typingIndicator);
        const errorMessage = document.createElement('div');
        errorMessage.className = 'assistant-message';
        errorMessage.textContent = 'A apărut o eroare. Vă rugăm să încercați din nou mai târziu.';
        chatbox.appendChild(errorMessage);
        eventSource.close();
    };
});

function renderTrainingPlan(trainingPlan) {
    const assistantMessage = document.createElement('div');
    assistantMessage.className = 'assistant-message';

    Object.entries(trainingPlan).forEach(([day, exercises]) => {
        const card = document.createElement('div');
        card.className = 'card mb-3';

        const cardHeader = document.createElement('div');
        cardHeader.className = 'card-header';
        cardHeader.innerHTML = `<button class="btn btn-link" data-bs-toggle="collapse" data-bs-target="#${day}" aria-expanded="false">${day}</button>`;
        card.appendChild(cardHeader);

        const cardBody = document.createElement('div');
        cardBody.id = day;
        cardBody.className = 'collapse';
        cardBody.innerHTML = exercises.length
            ? `<ul>${exercises.map((exercise) => `<li>${exercise}</li>`).join('')}</ul>`
            : `<p>No exercises scheduled.</p>`;

        card.appendChild(cardBody);
        card.style.marginBottom = '10px';

        assistantMessage.appendChild(card);
    });

    chatbox.appendChild(assistantMessage);
    chatbox.scrollTop = chatbox.scrollHeight;
}