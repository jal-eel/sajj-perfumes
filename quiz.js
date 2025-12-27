const questions = [
    {
        q: "What's your 'Big Steeze' outfit for a Saturday?",
        options: [
            { text: "Oversized hoodie & baggy jeans", type: "Addictive" },
            { text: "Clean white tee & fresh kicks", type: "Dayyan" },
            { text: "Full Traditional/Agbada vibes", type: "Oud" },
            { text: "Vintage leather jacket & boots", type: "Intense" },
            { text: "Something colorful and 'Soft Life'", type: "Amber" }
        ]
    },
    {
        q: "Pick a spot for the link-up:",
        options: [
            { text: "The Palms Mall / Game Center", type: "Addictive" },
            { text: "A quiet aesthetic Cafe", type: "Dayyan" },
            { text: "A high-end restaurant", type: "Oud" },
            { text: "Late night house party", type: "Intense" },
            { text: "Beach picnic at sunset", type: "Amber" }
        ]
    },
    {
        q: "Your social media energy is...",
        options: [
            { text: "Spamming TikTok dances", type: "Addictive" },
            { text: "Minimalist IG Photo Dumps", type: "Dayyan" },
            { text: "LinkedIn 'Young CEO' vibes", type: "Oud" },
            { text: "Mysterious / Dark Aesthetic", type: "Intense" },
            { text: "Travel and Food Vlogs", type: "Amber" }
        ]
    },
    {
        q: "How do you handle a 'No Gree' situation?",
        options: [
            { text: "Laugh it off and keep moving", type: "Dayyan" },
            { text: "Stand your ground firmly", type: "Intense" },
            { text: "Use wisdom and stay calm", type: "Oud" },
            { text: "Keep the energy positive", type: "Amber" },
            { text: "Make a joke out of it", type: "Addictive" }
        ]
    },
    {
        q: "What’s the main goal for your scent?",
        options: [
            { text: "I want people to ask 'What are you wearing?'", type: "Intense" },
            { text: "I want to smell clean and professional", type: "Dayyan" },
            { text: "I want a rich, expensive aura", type: "Oud" },
            { text: "I want something sweet and cozy", type: "Amber" },
            { text: "I want to be the life of the party", type: "Addictive" }
        ]
    }
];

let currentQ = 0;
let scores = { Amber: 0, Dayyan: 0, Oud: 0, Intense: 0, Addictive: 0 };
let finalScentName = ''; // To store the result for sharing

const resultsData = {
    Amber: { name: "Sajj Amber", desc: "You're all about the 'Soft Life.' Warm, sweet, and approachable—everyone loves being around your energy." },
    Dayyan: { name: "Sajj Dayyan", desc: "Pure class. You're the 'clean girl/boy' aesthetic. Sharp, fresh, and always put together." },
    Oud: { name: "Oud al Sajj", desc: "The Boss. You have a mature, wealthy aura that demands respect without saying a word." },
    Intense: { name: "Sajj Intense", desc: "Main Character energy. You are bold, mysterious, and your presence lingers long after you leave." },
    Addictive: { name: "Sajj Addictive", desc: "Unstoppable vibes. You're fun, energetic, and people literally can't get enough of you!" }
};


function showQuestion() {
    const qData = questions[currentQ];
    document.getElementById('question-text').textContent = qData.q;
    document.getElementById('progress-fill').style.width = `${((currentQ + 1) / questions.length) * 100}%`;
    
    const list = document.getElementById('options-list');
    list.innerHTML = '';

    qData.options.forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'option-btn';
        btn.textContent = opt.text;
        btn.onclick = () => {
            scores[opt.type]++;
            currentQ++;
            if (currentQ < questions.length) { showQuestion(); } 
            else { showResult(); }
        };
        list.appendChild(btn);
    });
}

function showResult() {
    document.getElementById('quiz-box').classList.add('hidden');
    const resArea = document.getElementById('result-area');
    resArea.classList.remove('hidden');

    const winner = Object.keys(scores).reduce((a, b) => scores[a] > scores[b] ? a : b);
    
    finalScentName = resultsData[winner].name; // Store the result
    document.getElementById('scent-name').textContent = finalScentName;
    document.getElementById('scent-desc').textContent = resultsData[winner].desc;

    // Attach share event listener
    document.getElementById('share-button').addEventListener('click', shareMyScent);
}

function retakeQuiz() {
    currentQ = 0;
    scores = { Amber: 0, Dayyan: 0, Oud: 0, Intense: 0, Addictive: 0 };
    finalScentName = '';
    document.getElementById('result-area').classList.add('hidden');
    document.getElementById('quiz-box').classList.remove('hidden');
    showQuestion();
}

function shareMyScent() {
    const shareText = `Just found my perfect SAJJ scent: ${finalScentName}! What's yours? Take the quiz at [Your Website Link Here] #SAJJPerfumes #ScentMatch #Nigeria #Perfume`;
    const shareUrl = window.location.href; // Automatically uses the current page URL

    if (navigator.share) {
        navigator.share({
            title: 'SAJJ Scent Match Quiz',
            text: shareText,
            url: shareUrl,
        })
        .then(() => console.log('Shared successfully'))
        .catch((error) => console.error('Error sharing:', error));
    } else {
        // Fallback for browsers that don't support Web Share API
        alert("Copy this to share!\n\n" + shareText);
        // You could also open a new window for Twitter/Facebook if needed
        // window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`);
    }
}

showQuestion();