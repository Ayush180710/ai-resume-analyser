const API_KEY = "AIzaSyCTLvM_fH0ZZ8Znz2vbkpLU9_equ0iEY5o"; // Replace this with your zoro or h2y key
// PUT YOUR LATEST API KEY HERE

async function analyze() {
    let file = document.getElementById("resumeFile").files[0];
    const resultsSection = document.getElementById("resultsSection");
    const aiContainer = document.getElementById("ai");
    const analyzeBtn = document.getElementById("analyzeBtn");

    if (!file) {
        alert("Please upload a resume PDF.");
        return;
    }

    let jobInput = document.getElementById("job").value;
    if (jobInput.trim() === "") {
        alert("Please paste job description skills.");
        return;
    }

    // UI Loading State
    analyzeBtn.disabled = true;
    analyzeBtn.innerText = "Analyzing... Please wait";
    resultsSection.style.display = "block";
    
    // Hide previous results while loading
    document.getElementById("score").innerText = "";
    document.getElementById("ats").innerText = "";
    document.getElementById("missing").innerText = "";
    document.getElementById("bar").style.width = "0%";
    document.getElementById("printBtn").style.display = "none";

    aiContainer.innerHTML = "<em>Extracting text from PDF...</em>";
    
    let text = await extractPDF(file);
    
    // Skill Matching Logic
    let job = jobInput.toLowerCase().split(/\W+/);
    let resumeWords = text.toLowerCase().split(/\W+/);

    let match = 0;
    let missing = [];

    job.forEach(skill => {
        if (skill.length > 0) {
            if (resumeWords.includes(skill)) {
                match++;
            } else {
                missing.push(skill);
            }
        }
    });

    let validJobWordsCount = job.filter(skill => skill.length > 0).length;
    let score = validJobWordsCount > 0 ? Math.round((match / validJobWordsCount) * 100) : 0;

    // Update UI with Scores
    setTimeout(() => {
        document.getElementById("bar").style.width = score + "%";
    }, 100); // Small delay for the animation to look smooth

    let level = "";
    if (score > 80) level = "Strong Fit";
    else if (score > 60) level = "Moderate Fit";
    else level = "Needs Improvement";

    document.getElementById("score").innerText = "Skill Match: " + score + "% (" + level + ")";
    document.getElementById("ats").innerText = "ATS Compatibility Score: " + score + "%";
    
    if (missing.length > 0) {
        document.getElementById("missing").style.display = "inline-block";
        document.getElementById("missing").innerText = "Missing Skills: " + missing.join(", ");
    } else {
        document.getElementById("missing").style.display = "none";
    }

    // Call the AI
    await generateAI(text);
    
    // Restore button state
    analyzeBtn.disabled = false;
    analyzeBtn.innerText = "Run AI Analysis";
}

async function extractPDF(file) {
    let reader = new FileReader();

    return new Promise((resolve) => {
        reader.onload = async function () {
            let typedarray = new Uint8Array(this.result);
            let pdf = await pdfjsLib.getDocument(typedarray).promise;
            let text = "";

            for (let i = 1; i <= pdf.numPages; i++) {
                let page = await pdf.getPage(i);
                let content = await page.getTextContent();
                content.items.forEach(item => {
                    text += item.str + " ";
                });
            }
            resolve(text);
        };
        reader.readAsArrayBuffer(file);
    });
}

async function generateAI(resumeText) {
    const aiContainer = document.getElementById("ai");
    aiContainer.innerHTML = "<em>Analyzing resume with Gemini AI... this takes a few seconds...</em>";

    let prompt = `
    You are an expert technical recruiter.
    Analyze this resume text and provide:
    1. Three major strengths
    2. Three areas for improvement (be specific)
    3. Two highly recommended skills to learn based on industry trends

    Format your response clearly using markdown with bullet points and bold text. Keep it professional and concise.
    
    Resume Text:
    ${resumeText}
    `;

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${API_KEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }]
                })
            }
        );

        const data = await response.json();

        if (data.candidates && data.candidates.length > 0) {
            const aiText = data.candidates[0].content.parts[0].text;
            // Convert Markdown to HTML
            aiContainer.innerHTML = marked.parse(aiText); 
            // Show the Print Button now that we have data
            document.getElementById("printBtn").style.display = "inline-block";
        } else if (data.error) {
            aiContainer.innerHTML = `<span style="color:red;">Google API Error: ${data.error.message}</span>`;
        } else {
            aiContainer.innerHTML = "AI response received but no suggestions generated.";
        }

    } catch (error) {
        console.error(error);
        aiContainer.innerHTML = `<span style="color:red;">Network error: Failed to reach the AI server. Check your connection.</span>`;
    }
}

// Function triggered by the Print Button
function printReport() {
    window.print();
}