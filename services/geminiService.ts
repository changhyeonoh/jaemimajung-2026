
import { GoogleGenAI, Type } from "@google/genai";
import { AnalysisResult } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const analyzeSidewalk = async (base64Image: string): Promise<AnalysisResult> => {
  // 더 복잡한 추론과 정확한 법규 해석을 위해 gemini-3-pro-preview 사용
  const model = 'gemini-3-pro-preview';
  
  const systemInstruction = `
    당신은 은평구 재미마중사회적협동조합의 전문 편의시설 모니터링 조사관입니다.
    분석 시 반드시 대한민국 '장애인·노인·임산부 등의 편의증진 보장에 관한 법률(편의증진법)' 및 '교통약자의 이동편의 증진법'의 시행규칙 기준을 적용하십시오.
    
    [핵심 분석 및 판정 기준]
    1. 단차 (턱 낮추기): 보도와 차도의 경계, 주출입구의 높이 차이는 2cm 이하이어야 합니다. 2cm 초과 시 '법적 기준 미달'로 판정하십시오.
    2. 유효폭: 휠체어가 통과할 수 있는 최소 유효폭은 1.2m 이상이어야 합니다. 지장물로 인해 폭이 좁아진 경우 '이동권 침해'로 간주합니다.
    3. 기울기: 경사로의 기울기는 1/12(8.3%) 이하여야 합니다. (지형상 불가피한 경우 1/8까지 허용되나 위험성 명시)
    4. 바닥면: 휠체어 바퀴가 빠지지 않도록 배수구 그레이팅 틈새는 2cm 이하여야 하며, 바닥면은 미끄럽지 않은 재질이어야 합니다.
    5. 점자블록: 휠체어 사용자에게는 점자블록이 장애물이 될 수 있으므로, 설치 위치와 상태(단차 유발 여부)를 함께 확인하십시오.
    
    반드시 다음 JSON 구조로 응답하십시오:
    {
      "riskLevel": "LOW" | "MEDIUM" | "HIGH",
      "stepHeight": "법적 기준(2cm) 대비 실제 상태 (예: 법적 기준 2cm를 초과하는 5cm 단차 확인)",
      "obstacles": ["식별된 지장물 및 법적 위반 요소 목록"],
      "vulnerabilityReport": "법규 기준에 근거한 현장의 문제점 서술 (휠체어 및 뇌병변 장애 특성 고려)",
      "recommendations": ["법적 설치 기준에 부합하는 구체적인 시정 권고 사항"]
    }
  `;

  const prompt = "첨부된 사진의 시설을 대한민국 장애인 편의시설 설치 기준에 따라 분석하여 상세 보고서를 작성해줘.";

  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Image.split(',')[1] || base64Image,
            },
          },
          { text: prompt },
        ],
      },
      config: {
        systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            riskLevel: { type: Type.STRING },
            stepHeight: { type: Type.STRING },
            obstacles: { type: Type.ARRAY, items: { type: Type.STRING } },
            vulnerabilityReport: { type: Type.STRING },
            recommendations: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["riskLevel", "stepHeight", "obstacles", "vulnerabilityReport", "recommendations"],
        },
      },
    });

    const text = response.text;
    if (!text) throw new Error("분석 응답이 비어있습니다.");
    
    const result = JSON.parse(text);
    return result as AnalysisResult;
  } catch (error) {
    console.error("Gemini Pro Analysis Error:", error);
    throw new Error("Gemini 3 Pro 엔진을 통한 법규 분석 중 오류가 발생했습니다.");
  }
};
