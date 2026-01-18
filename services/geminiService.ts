
import { GoogleGenAI } from "@google/genai";
import { VehicleTableData } from "../types";

// وظيفة تحليل التقارير المعقدة (gemini-3-pro-preview)
export async function generateFleetReport(
    data: VehicleTableData[],
    analysisType: string,
    options: { vehicleId?: string; vehicleIds?: string[]; customPrompt?: string }
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    const model = 'gemini-3-pro-preview';
    let userRequest = '';

    switch (analysisType) {
        case 'general':
            userRequest = "Provide a general fleet-wide analysis, including the holistic ranking of all vehicles as specified in the critical instructions. Conclude with an overall assessment of the fleet's health and provide high-level strategic recommendations.";
            break;
        case 'holistic_ranking':
            userRequest = "Perform a holistic ranking of all vehicles from best to worst, as specified in the critical instructions. The ranking must be the primary focus of the report. Provide a detailed justification for each vehicle's position, explaining its strengths and weaknesses based on the provided data.";
            break;
        case 'detailed':
            userRequest = "Provide a detailed report for each vehicle individually. Analyze its performance, costs, and efficiency, and provide specific recommendations for each one.";
            break;
        case 'specific':
            if (!options.vehicleId) throw new Error('Vehicle ID is required for specific report.');
            userRequest = `Provide a detailed performance and cost analysis exclusively for vehicle number ${options.vehicleId}. Compare its performance to the fleet average if possible.`;
            break;
        case 'comparison':
            if (!options.vehicleIds || options.vehicleIds.length < 2) throw new Error('At least two Vehicle IDs are required for comparison.');
            userRequest = `Directly compare the performance, costs, and efficiency of the following vehicles: ${options.vehicleIds.join(', ')}. Highlight the key differences and declare a winner for different categories (e.g., most cost-effective, highest workload).`;
            break;
        case 'best_worst':
            userRequest = "Identify the top 3 best-performing and bottom 3 worst-performing vehicles. Base your evaluation on a combination of key metrics, primarily cost per ton and total tons collected. Justify your selections with data and provide clear reasons.";
            break;
        case 'custom':
            if (!options.customPrompt) throw new Error('A custom prompt is required.');
            userRequest = options.customPrompt;
            break;
        default:
            throw new Error('Invalid analysis type');
    }

    const fullPrompt = `
        You are an expert fleet management analyst. Your task is to analyze waste management vehicle data for the Mu'tah and Al-Mazar Municipality.

        **CRITICAL INSTRUCTIONS:**
        1.  All responses MUST be in formal Arabic.
        2.  All numbers in your response MUST be English numerals (e.g., 123, 45.6, 2024).
        3.  **Holistic Ranking:** When requested to perform a general analysis or ranking, you MUST rank all vehicles from best to worst. This ranking must be holistic, considering a combination of all provided variables, not just one. Key factors to weigh include cost-effectiveness (cost_ton, cost_trip), productivity (tons, trips), and manufacturing year (year). Present the ranking clearly (e.g., a numbered list) and provide a justification for each vehicle's position, explaining its strengths and weaknesses.
        4.  Provide specific, testable, and actionable recommendations. For example, suggest reassigning specific vehicles to different zones if data supports it ("انقل الضاغطة 7 إلى المنطقة الشرقية لتحسين الاستغلال").
        5.  The data provides total costs. When you mention costs, clarify they are totals for the entire period covered by the data.
        6.  The data columns are: veh (vehicle number), area (work zone), drivers, year (year of manufacture), cap_m3 (capacity in cubic meters), cap_ton (theoretical capacity in tons), trips (total trips), tons (total tons collected), fuel (total fuel cost), maint (total maintenance cost), cost_trip (average cost per trip), cost_ton (average cost per ton).

        **VEHICLE DATA (in JSON format):**
        ${JSON.stringify(data, null, 2)}

        **USER REQUEST:**
        ${userRequest}
    `;
    
    const response = await ai.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 } // ميزانية تفكير عالية للتحليلات العميقة
        }
    });
    
    return response.text || '';
}

// وظيفة الدردشة السريعة (gemini-flash-lite-latest) للردود اللحظية
export async function* chatWithDataStream(
    query: string,
    currentData: VehicleTableData[],
    comparisonData: VehicleTableData[],
    years: { selected: string, comparison: string }
) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });
    
    const systemInstruction = `
        أنت مساعد ذكاء اصطناعي خبير وسريع جداً في تحليل بيانات أسطول النفايات لبلدية مؤتة والمزار.
        لديك صلاحية الوصول إلى البيانات الحالية المفلترة في اللوحة.
        أجب على أسئلة المستخدم بدقة وبشكل فوري بناءً على البيانات المقدمة فقط.
        
        تعليمات هامة:
        1. استخدم اللغة العربية الفصحى فقط.
        2. استخدم الأرقام الإنجليزية دائماً (مثال: 123 وليس ١٢٣).
        3. إذا سأل المستخدم عن مقارنة، قارن بين بيانات السنة المختارة (${years.selected}) وبيانات سنة المقارنة (${years.comparison || 'لا توجد'}).
        4. كن مباشراً جداً واختصر الإجابة قدر الإمكان مع تقديم الأرقام الرئيسية.
        
        البيانات الحالية للسنة (${years.selected}):
        ${JSON.stringify(currentData)}
        
        بيانات سنة المقارنة (${years.comparison}):
        ${JSON.stringify(comparisonData)}
    `;

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-flash-lite-latest',
        contents: query,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.1, // درجة حرارة منخفضة جداً لضمان الثبات والدقة
            thinkingConfig: { thinkingBudget: 0 } // تعطيل التفكير لضمان أقل زمن استجابة ممكن
        }
    });

    for await (const chunk of responseStream) {
        yield chunk.text || '';
    }
}
