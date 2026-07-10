/**
 * Aegis AI Gemini Connector Service
 * Interfaces with Google Gemini 2.5 Flash API to parse medication instructions,
 * scan prescriptions via OCR, answer drug safety queries, and analyze drug interactions.
 */
const AIService = {
    // API endpoint for Gemini 2.5 Flash
    ENDPOINT: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",

    /**
     * Retrieves the stored API key from localStorage.
     * @returns {string|null}
     */
    getApiKey() {
        return localStorage.getItem("aegis_gemini_api_key");
    },

    /**
     * Saves the API key to localStorage.
     * @param {string} key 
     */
    saveApiKey(key) {
        localStorage.setItem("aegis_gemini_api_key", key.trim());
    },

    /**
     * Clears the API key from localStorage.
     */
    clearApiKey() {
        localStorage.removeItem("aegis_gemini_api_key");
    },

    /**
     * Checks if a valid key is set.
     * @returns {boolean}
     */
    hasApiKey() {
        const key = this.getApiKey();
        return !!(key && key.length > 10);
    },

    /**
     * Generates a structural response from Gemini 2.5 Flash
     * @param {string} prompt - User request
     * @param {Object} context - App state context (active medications, today's date, user info)
     * @param {Object} imageFile - Optional file object { base64: string, mimeType: string }
     * @returns {Promise<Object>} - Parsed JSON matching the schema
     */
    async analyze(prompt, context, imageFile = null) {
        const key = this.getApiKey();
        if (!key) {
            throw new Error("Gemini API key is missing. Please configure it in Settings.");
        }

        const url = `${this.ENDPOINT}?key=${key}`;

        // Construct System Instruction to orient Gemini
        const systemInstruction = `You are "Aegis AI", an intelligent, compassionate medical reminder assistant and safety agent.
Your goal is to help users manage their medication schedules, scan prescription images, explain medication schedules, and check for safety conflicts/interactions.

Current Date: ${context.currentDate}
User's Name: ${context.userName}

Active Medications already scheduled:
${context.activeMedications.length > 0 
    ? context.activeMedications.map(m => `- ${m.name} ${m.dosage} (${m.frequency}, times: ${m.times.join(', ')}), start: ${m.startDate}, end: ${m.endDate || 'N/A'}. Instructions: ${m.instructions || 'None'}`).join('\n')
    : "None"}

CRITICAL RULES:
1. When the user asks to schedule a medicine, or uploads a prescription image containing meds, parse them into the "reminders" field.
2. Select appropriate default times in 24h format (HH:MM) if not specified:
   - "daily": ["09:00"]
   - "twice_daily": ["09:00", "21:00"]
   - "thrice_daily": ["09:00", "14:00", "21:00"]
   - "weekly": ["09:00"] (runs on the day of the week of start date, or Sunday)
   - "custom": parse custom times or default to ["09:00"]
3. Format startDate as YYYY-MM-DD. Use today (${context.currentDate}) or tomorrow if they say "starting tomorrow". If no start is specified, use today.
4. Calculate endDate if they specify a duration (e.g. "for 5 days" starting today (2026-07-10) means endDate is 2026-07-14 inclusive).
5. Always check for potential drug interactions or conflicts between any new medications the user is trying to add AND the active medications list. Populate the "drugInteractions" block with details if a concern exists.
6. Provide a warm, conversational, clear response in the "reply" field. Explain what you scheduled, answer any general queries, or warn about interactions.
7. Medical Disclaimer: In your conversational reply, if giving advice or warning, add a quick, small warning label: "[AI Medical Disclaimer: Consult a physician for verified clinical advice]."
8. Your output must strictly conform to the JSON schema. No surrounding markdown backticks, raw JSON only.`;

        // Build prompt parts
        const parts = [];
        
        // Add image part if available
        if (imageFile && imageFile.base64 && imageFile.mimeType) {
            parts.push({
                inlineData: {
                    mimeType: imageFile.mimeType,
                    data: imageFile.base64
                }
            });
            // Guide text for image upload
            parts.push({
                text: `Scan this prescription image. Extract all medications, dosages, frequency, durations, and instructions. Match with the prompt: "${prompt || 'Import this prescription'}"`
            });
        } else {
            parts.push({
                text: prompt
            });
        }

        // Schema structure to force structured outputs
        const jsonSchema = {
            type: "OBJECT",
            properties: {
                intent: {
                    type: "STRING",
                    enum: ["schedule", "query", "safety_check"]
                },
                reply: {
                    type: "STRING",
                    description: "Friendly conversational response summarizing what was scheduled, answering queries, or detailing drug interactions."
                },
                reminders: {
                    type: "ARRAY",
                    description: "List of parsed reminders to schedule. Keep empty if intent is only query/safety_check with no scheduling actions.",
                    items: {
                        type: "OBJECT",
                        properties: {
                            name: { type: "STRING" },
                            dosage: { type: "STRING" },
                            frequency: { 
                                type: "STRING", 
                                enum: ["daily", "twice_daily", "thrice_daily", "weekly", "custom"] 
                            },
                            times: { 
                                type: "ARRAY", 
                                items: { type: "STRING" },
                                description: "List of 24h format strings (HH:MM) like ['09:00', '21:00']"
                            },
                            startDate: { type: "STRING", description: "YYYY-MM-DD" },
                            endDate: { type: "STRING", description: "YYYY-MM-DD" },
                            instructions: { type: "STRING", description: "Special directions e.g. after food" }
                        },
                        required: ["name", "dosage", "frequency", "times", "startDate"]
                    }
                },
                drugInteractions: {
                    type: "ARRAY",
                    description: "Details on potential drug-to-drug or drug-to-food safety alerts.",
                    items: {
                        type: "OBJECT",
                        properties: {
                            severity: { type: "STRING", enum: ["high", "moderate", "low"] },
                            medicines: { 
                                type: "ARRAY", 
                                items: { type: "STRING" },
                                description: "List of two or more medication names involved in the interaction."
                            },
                            description: { type: "STRING", description: "Clear summary of the interaction risks and guidance." }
                        },
                        required: ["severity", "medicines", "description"]
                    }
                }
            },
            required: ["intent", "reply"]
        };

        const payload = {
            contents: [
                {
                    role: "user",
                    parts: parts
                }
            ],
            systemInstruction: {
                parts: [
                    {
                        text: systemInstruction
                    }
                ]
            },
            generationConfig: {
                responseMimeType: "application/json",
                responseSchema: jsonSchema,
                temperature: 0.1 // Keep it deterministic for safety & scheduling parsing
            }
        };

        try {
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                const errMsg = errData.error?.message || response.statusText || "Unknown API error";
                throw new Error(`Gemini API Error: ${errMsg}`);
            }

            const data = await response.json();
            const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;
            
            if (!textResponse) {
                throw new Error("Received empty response from Gemini API.");
            }

            return JSON.parse(textResponse);
        } catch (error) {
            console.error("AIService Analysis Error:", error);
            throw error;
        }
    },

    /**
     * Standalone safety checker to run whenever medications are modified.
     * @param {Array} medications - Active medications list
     * @returns {Promise<Array>} - List of interactions found
     */
    async checkInteractions(medications) {
        if (medications.length < 2) {
            return []; // No interactions possible with only one medicine
        }

        if (!this.hasApiKey()) {
            return [];
        }

        const prompt = "Please evaluate my current medications for potential interactions.";
        const context = {
            currentDate: new Date().toISOString().split('T')[0],
            userName: "Patient",
            activeMedications: medications
        };

        try {
            const result = await this.analyze(prompt, context);
            return result.drugInteractions || [];
        } catch (err) {
            console.error("AIService checkInteractions failure", err);
            return [];
        }
    }
};

// Bind to window to avoid CORS import issues on local double-click
window.AIService = AIService;
