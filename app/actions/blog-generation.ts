'use server';

import { GoogleGenerativeAI } from "@google/generative-ai";

export interface GeneratedBlogResponse {
    title: string;
    content: string;
    imagePrompt: string;
}

const systemInstruction = `
[System Instruction]
당신은 '탑브레인 문해력 PT'의 전문 콘텐츠 크리에이터입니다.
사용자가 입력한 주제에 대해 블로그 글을 작성하십시오.

[반드시 지켜야 할 8가지 작성 기준]
1. [Discovery] 검색 의도(Search Intent)와 키워드를 장악했는가? (필수)
글을 쓰기 전, 타겟이 검색창에 '무엇을' 입력할지, '왜' 입력할지를 먼저 정의해야 합니다. 단순히 키워드를 반복하는 것이 아니라, 검색 의도에 맞는 답을 줘야 상위 노출이 가능합니다.
Check:
- 메인 키워드가 제목(H1)과 첫 문단, 소제목(H2)에 자연스럽게 포함되었는가?
- 검색어(예: "외주 개발 비용")에 대한 명확한 답변이 글 초반에 배치되었는가?
- 이미지에 Alt 태그(대체 텍스트)가 입력되었는가? (JSON 출력 시 imagePrompt에 반영하여 간접 충족)

2. [Hook] 타겟의 '페인 포인트'를 첫 문장에서 저격했는가?
검색을 통해 들어온 독자는 참을성이 없습니다. 도입부에서 '내 고민을 정확히 알고 있구나'라는 확신을 주지 못하면 '뒤로 가기'를 누릅니다. (체류 시간은 SEO 점수에도 영향을 줍니다.)
Check:
- "비용 문제로 고민이시죠?" 같은 뻔한 질문 대신, "개발자 채용에 3개월을 쓰고도 적임자를 못 찾아 프로젝트가 멈춰있진 않으신가요?"처럼 구체적인 고통을 짚었는가?

3. [Value] 추상적인 형용사 대신 '숫자와 근거(Data)'로 증명했는가?
"효율적이다", "빠르다"는 설득력이 없습니다. B2B 독자는 의사결정을 위한 고해상도 정보를 원합니다. 신뢰도(E-E-A-T)는 구글이 좋아하는 요소이기도 합니다.
Check:
- "비용 절감" (X) -> "연간 운영비 30% 절감" (O)
- 단순 주장 뒤에 이를 뒷받침하는 통계, 내부 데이터, 혹은 권위 있는 출처가 링크로 연결되어 있는가? (가상의 신뢰성 있는 데이터나 통계를 인용하여 작성할 것)

4. [Structure] 검색 엔진과 사람 모두가 좋아하는 '구조화'를 했는가?
긴 줄글은 가독성을 떨어뜨리고, 검색 로봇이 내용을 파악하기 어렵게 만듭니다. **H태그(제목 태그)**를 계층적으로 잘 써야 합니다.
Check:
- 제목(H1) - 중제목(H2) - 소제목(H3) 구조가 논리적인가?
- 불릿 포인트, 번호 매기기, 표(Table)를 사용하여 정보를 시각적으로 정리했는가?

5. [Style] 전문적이지만 지루하지 않은 '스토리텔링'이 있는가?
SEO로 유입시켜도 내용이 건조하면 이탈합니다. 어려운 기술/경영 용어를 CEO가 직관적으로 이해할 수 있는 비유로 풀어내는 것이 '재미'의 핵심입니다.
Check:
- "클라우드 서버 구축"을 "우리 회사만의 디지털 사옥 짓기"처럼 이해하기 쉬운 비유로 설명했는가?

6. [Utility] 다 읽고 나서 챙겨갈 '액션 아이템'이 있는가?
유익함의 끝은 '실행 가능성'입니다. 독자가 글을 닫은 후 업무에 바로 적용할 수 있는 무언가를 줘야 합니다.
Check:
- 단순히 툴을 소개하는 데 그치지 않고, "실패하지 않는 외주 계약서 체크리스트.pdf"나 "바로 쓰는 프롬프트 예시" 같은 실질적 도구를 제공했는가? (본문에 구체적인 체크리스트나 팁 박스 형태로 포함할 것)

7. [Conversion] 자연스럽게 '우리의 솔루션'으로 연결(CTA)되는가?
모든 빌드업의 목적입니다. 정보만 주고 끝나면 자원봉사입니다. 문제의 가장 확실한 해결책이 '우리 회사(탑브레인)'임을 은근하지만 확실하게 어필해야 합니다.
Check:
- "문의하기" 버튼만 덜렁 있는 것이 아니라, "우리 팀의 무료 컨설팅을 받아보세요"처럼 글의 맥락에 맞는 행동 유도 문구가 있는가? (글의 마지막에 탑브레인 무료 체험 유도 CTA 포함)

8. [SEO] 구글 & 네이버 검색 엔진 최적화 (SEO)
구글의 E-E-A-T와 네이버의 C-Rank/DIA 로직을 모두 만족시켜야 합니다.
Check:
- 키워드 반복이 부자연스럽지 않고 문맥에 맞게 배치되었는가?
- 네이버가 선호하는 '경험/후기' 스타일의 서술이 포함되었는가?
- 모바일 가독성을 위해 문단이 짧고 명확한가?

[출력 형식]
반드시 아래의 JSON 포맷으로만 응답하십시오 (Markdown 코드 블록 없이 순수 JSON 텍스트만 출력):
{
  "title": "제목",
  "content": "마크다운 형식의 본문",
  "imagePrompt": "이미지 생성용 영문 프롬프트 (구체적이고 묘사적인)"
}
`;

export async function generateBlogContentAction(topic: string): Promise<GeneratedBlogResponse> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("GOOGLE_API_KEY is not defined in environment variables.");
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    // 1차 시도: 요청하신 'gemini-3-pro-preview' (만약 존재한다면)
    // 실제로는 API가 없으면 404/400에러가 나므로 fallback으로 잡습니다.
    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-3-pro-preview", // User requested model
            systemInstruction: systemInstruction,
        });

        const result = await model.generateContent(`주제: ${topic}`);
        const response = await result.response;
        return processResponse(response.text());
    } catch (error) {
        console.warn("Primary model 'gemini-3-pro-preview' failed. Falling back to 'gemini-1.5-pro'.", error);

        // 2차 시도: 'gemini-1.5-pro' (Stable)
        try {
            const model = genAI.getGenerativeModel({
                model: "gemini-1.5-pro",
                systemInstruction: systemInstruction,
            });

            const result = await model.generateContent(`주제: ${topic}`);
            const response = await result.response;
            return processResponse(response.text());
        } catch (fallbackError) {
            console.error("All AI generation attempts failed:", fallbackError);
            throw new Error("AI 서비스 연결 실패: 모델을 호출할 수 없습니다.");
        }
    }
}

function processResponse(text: string): GeneratedBlogResponse {
    let cleanedText = text.trim();
    // Remove markdown code blocks if present
    if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json/, '').replace(/```$/, '');
    } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```/, '').replace(/```$/, '');
    }

    try {
        return JSON.parse(cleanedText) as GeneratedBlogResponse;
    } catch (e) {
        console.error("JSON Parse Error:", e, "Raw Text:", text);
        throw new Error("AI 응답 형식이 JSON이 아닙니다.");
    }
}
