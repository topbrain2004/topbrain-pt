import { NextResponse } from "next/server"

export async function POST(req: Request) {
    try {
        const { question, userAnswer, correctAnswer, type, keywords } = await req.json()
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY

        let aiResult = null

        // 1. Try AI Grading if Key exists
        if (apiKey) {
            try {
                // Construct prompt
                let promptText = `
You are an expert Korean teacher grading a student's answer.
Analyze the 'Student Answer' against the 'Standard Answer' and 'Keywords'.

Question: ${question}
Standard Answer: ${correctAnswer}
Keywords: ${keywords ? keywords.join(", ") : "None"}
Student Answer: ${userAnswer}

Grading Criteria:
1. If the meaning is identical or functionally equivalent to the Standard Answer, mark as Correct.
2. If the answer demonstrates understanding of the core concept, mark as Correct.
3. If the answer is completely wrong or irrelevant, mark as Incorrect.
4. For Short Answer, allow minor spacing/particle differences.
5. For Essay, check if key ideas are captured.

Respond with ONLY a JSON object in the following format, no markdown formatting:
{
  "correct": boolean,
  "feedback": "A single sentence feedback in Korean"
}`

                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
                    {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            contents: [{ parts: [{ text: promptText }] }],
                            generationConfig: { responseMimeType: "application/json" }
                        })
                    }
                )

                if (response.ok) {
                    const data = await response.json()
                    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text
                    if (generatedText) {
                        const cleanJson = generatedText.replace(/```json/g, "").replace(/```/g, "").trim()
                        aiResult = JSON.parse(cleanJson)
                    }
                } else {
                    console.warn("Gemini API skipped (Status " + response.status + ")")
                }
            } catch (e) {
                console.warn("Gemini API call failed, falling back to local:", e)
            }
        }

        // 2. Return AI result if successful
        if (aiResult) {
            console.log("AI Grading Success:", aiResult)
            return NextResponse.json(aiResult)
        }

        // 3. Fallback: Local Keyword Grading
        console.log("Using Fallback Grading for:", userAnswer)

        let isCorrect = false
        const normUser = userAnswer.trim().toLowerCase().replace(/\s+/g, "")
        const normCorrect = correctAnswer.trim().toLowerCase().replace(/\s+/g, "")

        if (keywords && keywords.length > 0) {
            // Check if ANY valid keyword is missing? No, usually checking coverage.
            // Let's go simple: If >50% of keywords are found.
            const matchedCount = keywords.filter((k: string) => {
                const normKey = k.trim().toLowerCase().replace(/\s+/g, "")
                return normUser.includes(normKey)
            }).length

            // If only 1 keyword, must match. If 2, match 1 is usually okay for partial? 
            // Let's be generous: 50% match.
            const threshold = Math.ceil(keywords.length * 0.5)
            isCorrect = matchedCount >= threshold
        } else {
            // No keywords? Strict match or containment
            isCorrect = normUser === normCorrect || normUser.includes(normCorrect) || normCorrect.includes(normUser)
        }

        return NextResponse.json({
            correct: isCorrect,
            feedback: isCorrect
                ? "핵심 내용이 포함되어 정답으로 인정되었습니다. (AI 연결 불안정으로 기본 채점 적용)"
                : "정답과의 일치도가 낮습니다. (AI 연결 불안정으로 기본 채점 적용)"
        })

    } catch (error) {
        console.error("Critical Grading Error:", error)
        // Even in critical error, return FALSE rather than 500 to prevent crash logic in frontend
        return NextResponse.json({ correct: false, feedback: "채점 중 오류가 발생했습니다." })
    }
}
