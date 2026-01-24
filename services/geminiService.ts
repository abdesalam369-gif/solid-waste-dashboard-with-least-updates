
import { GoogleGenAI } from "@google/genai";
import { VehicleTableData } from "../types";

export interface RouteInfo {
    distance: string;
    mapLink: string;
}

export async function getOptimalRoute(startPoint: string): Promise<RouteInfo> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const targetLandfill = "مكب نفايات اللجون";
    
    // Explicit instructions for grounding
    const prompt = `Find the driving distance in kilometers from "${startPoint}" to "${targetLandfill}" in Jordan using road networks. 
    Return only the numeric distance value and a Google Maps URL for the route. 
    Format your response as a JSON: {"distance": "XX.X", "link": "https://..."}`;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
            tools: [{ googleMaps: {} }],
        }
    });

    try {
        const text = response.text || "{}";
        const jsonStr = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
        const data = JSON.parse(jsonStr);
        
        // Use grounding chunks for links if JSON failed or for validation
        const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
        const mapUri = grounding?.find(c => c.maps?.uri)?.maps?.uri || data.link || "";

        return {
            distance: data.distance || "—",
            mapLink: mapUri || `https://www.google.com/maps/dir/${encodeURIComponent(startPoint)}/${encodeURIComponent(targetLandfill)}`
        };
    } catch (e) {
        console.error("Route parsing error:", e);
        return {
            distance: "—",
            mapLink: `https://www.google.com/maps/dir/${encodeURIComponent(startPoint)}/${encodeURIComponent(targetLandfill)}`
        };
    }
}

export async function generateFleetReport(
    data: VehicleTableData[],
    analysisType: string,
    options: { vehicleId?: string; vehicleIds?: string[]; customPrompt?: string },
    language: string = 'ar'
): Promise<string> {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-3-pro-preview';
    let userRequest = '';
    const isEn = language === 'en';

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
        1.  All responses MUST be in ${isEn ? 'formal English' : 'formal Arabic'}.
        2.  All numbers in your response MUST be English numerals (e.g., 123, 45.6, 2024).
        3.  **Holistic Ranking:** When requested to perform a general analysis or ranking, you MUST rank all vehicles from best to worst. This ranking must be holistic, considering a combination of all provided variables, not just one. Key factors to weigh include cost-effectiveness (cost_ton, cost_trip), productivity (tons, trips), and manufacturing year (year). Present the ranking clearly (e.g., a numbered list) and provide a justification for each vehicle's position, explaining its strengths and weaknesses.
        4.  Provide specific, testable, and actionable recommendations.
        5.  The data provides total costs for the period.
        6.  Columns: veh (ID), area (zone), drivers, year (mfg), cap_m3, cap_ton (theoretical ton capacity), trips (total count), tons (total weight), fuel (total cost), maint (total cost), cost_trip (avg), cost_ton (avg).

        **VEHICLE DATA (in JSON format):**
        ${JSON.stringify(data, null, 2)}

        **USER REQUEST:**
        ${userRequest}
    `;
    
    const response = await ai.models.generateContent({
        model: model,
        contents: fullPrompt,
        config: {
            thinkingConfig: { thinkingBudget: 32768 }
        }
    });
    
    return response.text || '';
}

export async function* chatWithDataStream(
    query: string,
    currentData: VehicleTableData[],
    comparisonData: VehicleTableData[],
    years: { selected: string, comparison: string },
    language: string = 'ar'
) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isEn = language === 'en';
    
    const systemInstruction = `
        You are an AI fleet management expert for the Mu'tah and Al-Mazar Municipality.
        Current Year: ${years.selected}
        Comparison Year: ${years.comparison || 'None'}
        
        CRITICAL:
        1. Respond strictly in ${isEn ? 'English' : 'Arabic'}.
        2. Use English numerals.
        3. Be concise and data-driven.
        
        Current Data:
        ${JSON.stringify(currentData)}
        
        Comparison Data:
        ${JSON.stringify(comparisonData)}
    `;

    const responseStream = await ai.models.generateContentStream({
        model: 'gemini-flash-lite-latest',
        contents: query,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.1, 
            thinkingConfig: { thinkingBudget: 0 }
        }
    });

    for await (const chunk of responseStream) {
        yield chunk.text || '';
    }
}
