async function analyze() {
    const fileInput = document.getElementById("resumeFile");
    const resultsSection = document.getElementById("resultsSection");
    const aiContainer = document.getElementById("ai");
    const analyzeBtn = document.getElementById("analyzeBtn");

    if (!fileInput.files.length) {
        alert("Please upload a PDF document.");
        return;
    }

    const jobInput = document.getElementById("job").value;
    if (jobInput.trim() === "") {
        alert("Please provide the target job skills.");
        return;
    }

    analyzeBtn.disabled = true;
    analyzeBtn.innerText = "Processing...";
    resultsSection.style.display = "block";
    
    resetUI();
    aiContainer.innerHTML = "<em>Extracting document content...</em>";
    
    try {
        const text = await extractPDF(fileInput.files[0]);
        calculateMatch(text, jobInput);
        await fetchInsights(text);
    } catch (error) {
        console.error("Analysis Error:", error);
        aiContainer.innerHTML = `<span style="color:red;">Failed to process document.</span>`;
    } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerText = "Run Analysis";
    }
}

function resetUI() {
    document.getElementById("score").innerText = "";
    document.getElementById("ats").innerText = "";
    document.getElementById("missing").innerText = "";
    document.getElementById("bar").style.width = "0%";
    document.getElementById("printBtn").style.display = "none";
}

function calculateMatch(resumeText, jobInput) {
    const jobKeywords = jobInput.toLowerCase().split(/\W+/).filter(word => word.length > 0);
    const resumeWords = resumeText.toLowerCase().split(/\W+/);

    let matchCount = 0;
    const missingSkills = [];

    jobKeywords.forEach(skill => {
        if (resumeWords.includes(skill)) {
            matchCount++;
        } else {
            missingSkills.push(skill);
        }
    });

    const score = jobKeywords.length > 0 ? Math.round((matchCount / jobKeywords.length) * 100) : 0;
    
    setTimeout(() => {
        document.getElementById("bar").style.width = score + "%";
    }, 100);

    const matchLevel = score > 80 ? "Strong Fit" : score > 60 ? "Moderate Fit" : "Needs Improvement";

    document.getElementById("score").innerText = `Match Rating: ${score}% (${matchLevel})`;
    document.getElementById("ats").innerText = `ATS Score: ${score}%`;
    
    const missingEl = document.getElementById("missing");
    if (missingSkills.length > 0) {
        missingEl.style.display = "inline-block";
        missingEl.innerText = "Missing Keywords: " + missingSkills.join(", ");
    } else {
        missingEl.style.display = "none";
    }
}

async function extractPDF(file) {
    const reader = new FileReader();

    return new Promise((resolve, reject) => {
        reader.onload = async function () {
            try {
                const typedarray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedarray).promise;
                let text = "";

                for (let i = 1; i <= pdf.numPages; i++) {
                    const page = await pdf.getPage(i);
                    const content = await page.getTextContent();
                    content.items.forEach(item => text += item.str + " ");
                }
                resolve(text);
            } catch (err) {
                reject(err);
            }
        };
        reader.readAsArrayBuffer(file);
    });
}

async function fetchInsights(resumeText) {
    const aiContainer = document.getElementById("ai");
    aiContainer.innerHTML = "<em>Generating insights...</em>";

    try {
        const response = await fetch('https://ai-resume-analyser-eobn.onrender.com/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ resumeText })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            aiContainer.innerHTML = marked.parse(data.text);
            document.getElementById("printBtn").style.display = "inline-block";
        } else {
            aiContainer.innerHTML = `<span style="color:red;">Error: ${data.error || "Failed to generate insights."}</span>`;
        }
    } catch (error) {
        console.error("Network Error:", error);
        aiContainer.innerHTML = `<span style="color:red;">Connection error. Ensure backend server is running.</span>`;
    }
}

function printReport() {
    window.print();
}
