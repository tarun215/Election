// Initialize Lucide Icons
lucide.createIcons();

// DOM Elements
const chatHistory = document.getElementById('chat-history');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-button');
const clearChatBtn = document.getElementById('clear-chat');
const suggestionChips = document.querySelectorAll('.chip');

// State
let conversationHistory = [];

// System Prompt (The Persona Definition)
const SYSTEM_PROMPT = `
You are an advanced AI assistant that explains election processes in a clear, structured, interactive, and user-friendly way. Your purpose is to help users fully understand how elections work, what steps are involved, and how they can participate.

🎯 Primary Goals
Transform complex election systems into simple, step-by-step explanations
Provide accurate, neutral, and educational information only
Guide users like a personal tutor, not just an information source
Adapt dynamically to user intent, knowledge level, and location (if given)

⚙️ Core Behavior Rules
Always start with a simple explanation
Then expand into a numbered step-by-step breakdown
Use examples or analogies when helpful
End with a short summary
Offer next-step guidance or optional deeper exploration

🗳️ Election Knowledge Scope
You can explain: Voter registration process, Candidate nomination & eligibility, Campaigning rules and period, Voting methods (EVM, paper ballot, postal voting), Vote counting process, Result declaration, Government formation.

📅 Timeline Representation
When discussing elections, include a clear timeline flow. Always present timelines in chronological order.

🧭 Guided Action Mode
If the user asks practical questions (e.g., “How do I vote?”), respond with a checklist-style guide.

🌍 System Comparison Capability
Explain differences clearly between: Parliamentary vs Presidential systems, First-Past-The-Post vs Proportional Representation, Electoral College systems. Use side-by-side comparisons or simple contrasts.

🧠 Adaptive Intelligence
If the user is a beginner → simplify heavily + use analogies. If the user is a student → give structured, exam-ready content. If the user is advanced → include deeper system insights.

🗣️ Tone & Style
Clear, direct, and structured. Friendly but not casual. Avoid unnecessary jargon. Use bullet points and steps for readability.

⚖️ Strict Neutrality Policy
Never promote, support, or criticize any political party, candidate, or ideology. Never attempt to influence opinions. Only explain processes, systems, and procedures.

🧱 Standard Output Format
1. Simple Explanation
2. Step-by-Step Breakdown
3. Example / Analogy (optional)
4. Timeline (if relevant)
5. Quick Summary
`;

// Initialize
function init() {
    enableInput();
    
    // Auto-resize textarea
    userInput.addEventListener('input', function() {
        this.style.height = 'auto';
        this.style.height = (this.scrollHeight) + 'px';
        
        // Enable/disable send button based on input
        if (this.value.trim() !== '') {
            sendBtn.disabled = false;
        } else {
            sendBtn.disabled = true;
        }
    });

    // Enter to send (Shift+Enter for new line)
    userInput.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            if (!sendBtn.disabled) {
                sendMessage();
            }
        }
    });
}

// Event Listeners
sendBtn.addEventListener('click', sendMessage);

clearChatBtn.addEventListener('click', () => {
    // Keep only the welcome message
    const messages = chatHistory.querySelectorAll('.message:not(.welcome-message)');
    messages.forEach(msg => msg.remove());
    conversationHistory = [];
});

suggestionChips.forEach(chip => {
    chip.addEventListener('click', () => {
        userInput.value = chip.dataset.prompt;
        userInput.dispatchEvent(new Event('input')); // trigger resize and button state
        sendMessage();
    });
});

// Helper Functions

function enableInput() {
    userInput.disabled = false;
    if (userInput.value.trim() !== '') {
        sendBtn.disabled = false;
    }
}

function disableInput() {
    userInput.disabled = true;
    sendBtn.disabled = true;
}

function addMessageToUI(content, isUser) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${isUser ? 'user-message' : 'assistant-message'}`;
    
    const iconName = isUser ? 'user' : 'bot';
    
    // Parse markdown for assistant messages
    const parsedContent = isUser ? 
        `<p>${content.replace(/\n/g, '<br>')}</p>` : 
        marked.parse(content);
    
    messageDiv.innerHTML = `
        <div class="avatar">
            <i data-lucide="${iconName}"></i>
        </div>
        <div class="message-content">
            ${parsedContent}
        </div>
    `;
    
    chatHistory.appendChild(messageDiv);
    lucide.createIcons();
    scrollToBottom();
}

function showTypingIndicator() {
    // Remove existing if any
    hideTypingIndicator();
    
    const indicator = document.createElement('div');
    indicator.className = 'typing-indicator visible';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <span></span>
        <span></span>
        <span></span>
    `;
    chatHistory.appendChild(indicator);
    scrollToBottom();
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function scrollToBottom() {
    chatHistory.scrollTop = chatHistory.scrollHeight;
}

// API Interaction
async function sendMessage() {
    const text = userInput.value.trim();
    if (!text) return;

    // 1. Add user message to UI and history
    addMessageToUI(text, true);
    conversationHistory.push({ role: 'user', content: text });
    
    // 2. Clear input
    userInput.value = '';
    userInput.style.height = 'auto';
    sendBtn.disabled = true;
    
    // 3. Show loading
    showTypingIndicator();
    
    // 4. Call Gemini API
    try {
        const response = await callGeminiAPI(text);
        
        hideTypingIndicator();
        
        // 5. Add bot message to UI and history
        if (response && response.reply) {
            const botReply = response.reply;
            addMessageToUI(botReply, false);
            conversationHistory.push({ role: 'model', content: botReply });
        } else {
            throw new Error("Invalid response from API");
        }
        
    } catch (error) {
        console.error("API Error:", error);
        hideTypingIndicator();
        addMessageToUI("Sorry, I encountered an error communicating with the API. Please check your API key and network connection.", false);
    }
}

async function callGeminiAPI(prompt) {
    const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages: conversationHistory })
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
}

// Run init
init();
