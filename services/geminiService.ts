import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const GEMINI_MODEL = "gemini-3.1-pro-preview";
const FLASH_MODEL = "gemini-3-flash-preview";

const cleanJsonResponse = (text: string) => {
  console.log("Raw Gemini Response:", text);
  // Remove markdown code blocks
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  // Find the first '{' and last '}'
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    cleaned = cleaned.substring(start, end + 1);
  }
  return cleaned;
};

export const geminiService = {
  generateFlashcards: async (
    text: string, 
    subject: string, 
    count: number = 5, 
    type: string = 'front-back',
    extraInstructions: string = '',
    files: { data: string, mimeType: string }[] = [],
    urls: string[] = [],
    difficulty: string = 'medium',
    format: string = 'standard',
    sourceType: string = 'text',
    includeMnemonics: boolean = false
  ) => {
    const prompt = `
      Gere ${count} flashcards de estudo sobre "${subject}" baseados no seguinte conteúdo:
      "${text}"
      
      Tipo: ${type}
      Dificuldade: ${difficulty}
      Instruções extras: ${extraInstructions}
      Incluir mnemônicos: ${includeMnemonics ? 'Sim' : 'Não'}
      
      Retorne um array de objetos JSON com: front, back, difficulty, tags, e mnemonic (se solicitado).
    `;

    const contents: any[] = [{ parts: [{ text: prompt }] }];
    if (files.length > 0) {
      files.forEach(f => {
        contents[0].parts.push({
          inlineData: { data: f.data, mimeType: f.mimeType }
        });
      });
    }

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              difficulty: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } },
              mnemonic: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '[]');
  },

  generateFlashcardsStream: async (
    text: string, 
    subject: string, 
    count: number, 
    type: string,
    extraInstructions: string,
    files: { data: string, mimeType: string }[],
    urls: string[],
    difficulty: string,
    format: string,
    sourceType: string,
    includeMnemonics: boolean,
    onPartialResults: (cards: any[]) => void,
    frontLength?: string,
    backLength?: string
  ) => {
    const prompt = `
      Gere ${count} flashcards de estudo sobre "${subject}" baseados no seguinte conteúdo:
      "${text}"
      
      Tipo: ${type}
      Dificuldade: ${difficulty}
      Instruções extras: ${extraInstructions}
      Tamanho do frente: ${frontLength || 'padrão'}
      Tamanho do verso: ${backLength || 'padrão'}
      Incluir mnemônicos: ${includeMnemonics ? 'Sim' : 'Não'}
      
      Retorne um array de objetos JSON com: front, back, difficulty, tags, e mnemonic (se solicitado).
      IMPORTANTE: Retorne APENAS o array JSON.
    `;

    const contents: any[] = [{ parts: [{ text: prompt }] }];
    if (files.length > 0) {
      files.forEach(f => {
        contents[0].parts.push({
          inlineData: { data: f.data, mimeType: f.mimeType }
        });
      });
    }

    const result = await ai.models.generateContentStream({
      model: GEMINI_MODEL,
      contents,
      config: {
        responseMimeType: "application/json"
      }
    });

    let fullText = "";
    for await (const chunk of result) {
      fullText += chunk.text;
      try {
        const partial = JSON.parse(fullText);
        if (Array.isArray(partial)) {
          onPartialResults(partial);
        }
      } catch (e) {
      }
    }
    
    try {
      const final = JSON.parse(fullText);
      onPartialResults(final);
    } catch (e) {}
  },

  evaluateDissertativeAnswer: async (question: string, expectedAnswer: string, userAnswer: string) => {
    const prompt = `
      Avalie a resposta dissertativa do aluno.
      Pergunta: ${question}
      Resposta Esperada: ${expectedAnswer}
      Resposta do Aluno: ${userAnswer}
      
      Forneça uma nota de 0 a 100 e um feedback detalhado.
    `;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            score: { type: Type.NUMBER },
            feedback: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  fetchTermDefinition: async (term: string) => {
    const prompt = `
      Defina o termo jurídico "${term}" de forma clara e técnica.
      Retorne um JSON com:
      - definition: A definição técnica
      - example: Um exemplo de uso
      - isLatin: boolean indicando se é um termo em latim
      - translation: Tradução se for latim (opcional)
    `;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            definition: { type: Type.STRING },
            example: { type: Type.STRING },
            isLatin: { type: Type.BOOLEAN },
            translation: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  summarizeText: async (text: string) => {
    const prompt = `Resuma o seguinte texto jurídico de forma concisa: "${text}"`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.text;
  },

  extractKeyPoints: async (text: string) => {
    const prompt = `Extraia os pontos-chave do seguinte texto jurídico: "${text}"`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.STRING }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  },

  generateMindMap: async (text: string) => {
    const prompt = `Gere uma estrutura de mapa mental (em JSON) para o seguinte conteúdo: "${text}"`;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });
    return JSON.parse(response.text || '{}');
  },

  simplifyLegalText: async (text: string) => {
    const prompt = `Simplifique o seguinte "juridiquês" para uma linguagem acessível: "${text}"`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.text;
  },

  explainLegalTerm: async (term: string, context?: string) => {
    const prompt = `Explique o termo jurídico "${term}" ${context ? `no contexto de: ${context}` : ''} com exemplos práticos.`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.text;
  },

  generateMnemonic: async (requirements: string) => {
    const prompt = `
      Crie um mnemônico jurídico baseado nos seguintes requisitos: "${requirements}"
      Retorne um JSON com:
      - acronym: A sigla ou palavra mnemônica
      - title: Título do mnemônico
      - description: Explicação de como usar
      - expansion: Array de objetos { letter: string, meaning: string }
    `;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            acronym: { type: Type.STRING },
            title: { type: Type.STRING },
            description: { type: Type.STRING },
            expansion: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  letter: { type: Type.STRING },
                  meaning: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  extractPrecedent: async (text: string, correctAnswer?: string) => {
    const prompt = `
      Extraia o precedente judicial ou fundamento jurídico principal do seguinte caso:
      "${text}"
      ${correctAnswer ? `A resposta correta/fundamento é: ${correctAnswer}` : ''}
      
      Retorne um JSON com:
      - tese: A tese jurídica central
      - fundamentação: A fundamentação legal/doutrinária
      - jurisprudencia: Referência a jurisprudência correlata
    `;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tese: { type: Type.STRING },
            fundamentação: { type: Type.STRING },
            jurisprudencia: { type: Type.STRING }
          }
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  fetchLegalReference: async (query: string) => {
    const prompt = `Encontre referências legais (artigos, leis) para: "${query}"`;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.text;
  },

  analyzeJupiterPDF: async (base64PDF: string) => {
    const prompt = `
      Analise esta Ficha do Aluno da USP (JúpiterWeb). 
      Extraia as seguintes informações e retorne APENAS um JSON puro, sem textos adicionais ou marcações markdown.
      Formato esperado:
      {
        "full_name": "Nome Completo",
        "turma": 202X,
        "progresso_obrigatorias": 0,
        "progresso_optativas": 0,
        "progresso_total": 0,
        "status_geral_integralizacao": 0,
        "aniversario": "DD/MM/AAAA",
        "trajetoria": {
          "monitoria": false,
          "pesquisa": false,
          "intercambio": false
        },
        "disciplinas": [
          {
            "codigo": "DIN0123",
            "nome": "Nome da disciplina",
            "turma_sala": "Turma X / Sala Y",
            "horarios": {}
          }
        ]
      }
      Certifique-se de que os campos numéricos sejam números inteiros.
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "application/pdf",
                data: base64PDF
              }
            }
          ]
        }
      ],
      config: { responseMimeType: "application/json" }
    });

    let textResponse = '{}';
    try {
      textResponse = response.text || '{}';
    } catch (e) {
      console.error("Error getting response.text in PDF (possibly safety block):", e);
      throw new Error("A IA bloqueou a resposta ou falhou ao gerar o texto.");
    }

    const cleaned = cleanJsonResponse(textResponse);
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Gemini response in PDF:", cleaned);
      throw new Error("Falha ao interpretar a resposta da IA (JSON inválido).");
    }
    
    // Ensure numeric types
    return {
      ...data,
      turma: parseInt(data.turma) || 0,
      progresso_obrigatorias: parseInt(data.progresso_obrigatorias) || 0,
      progresso_optativas: parseInt(data.progresso_optativas) || 0,
      progresso_total: parseInt(data.progresso_total) || 0,
      status_geral_integralizacao: parseInt(data.status_geral_integralizacao) || 0,
    };
  },

  analyzeJupiterText: async (text: string) => {
    const prompt = `
      Analise o texto extraído de uma Ficha do Aluno da USP (JúpiterWeb). 
      Extraia as informações e retorne APENAS um JSON puro, sem textos adicionais ou marcações markdown.
      Formato esperado:
      {
        "full_name": "Nome Completo",
        "turma": 202X,
        "progresso_obrigatorias": 0,
        "progresso_optativas": 0,
        "progresso_total": 0,
        "status_geral_integralizacao": 0,
        "aniversario": "DD/MM/AAAA",
        "trajetoria": {
          "monitoria": false,
          "pesquisa": false,
          "intercambio": false
        },
        "disciplinas": [
          {
            "codigo": "DIN0123",
            "nome": "Nome da disciplina",
            "turma_sala": "Turma X / Sala Y",
            "horarios": {}
          }
        ]
      }
      Certifique-se de que os campos numéricos sejam números inteiros.
      
      Texto: "${text}"
    `;

    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: { responseMimeType: "application/json" }
    });

    let textResponse = '{}';
    try {
      textResponse = response.text || '{}';
    } catch (e) {
      console.error("Error getting response.text (possibly safety block):", e);
      throw new Error("A IA bloqueou a resposta ou falhou ao gerar o texto.");
    }

    const cleaned = cleanJsonResponse(textResponse);
    let data;
    try {
      data = JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse Gemini response in Text:", cleaned);
      throw new Error("Falha ao interpretar a resposta da IA (JSON inválido).");
    }
    
    // Ensure numeric types
    return {
      ...data,
      turma: parseInt(data.turma) || 0,
      progresso_obrigatorias: parseInt(data.progresso_obrigatorias) || 0,
      progresso_optativas: parseInt(data.progresso_optativas) || 0,
      progresso_total: parseInt(data.progresso_total) || 0,
      status_geral_integralizacao: parseInt(data.status_geral_integralizacao) || 0,
    };
  },

  analyzeProfile: async (profile: any) => {
    const prompt = `
      Analise o seguinte perfil de estudante de Direito da USP (SanFran) e forneça insights personalizados:
      - Nome: ${profile.full_name || profile.username || 'Não informado'}
      - Turma: ${profile.turma || 'Não informada'}
      - Progresso: ${profile.progresso_total || profile.progresso_curso || 0}%
      - Idiomas: ${profile.idiomas?.join(', ') || 'Nenhum'}
      - Intercâmbio: ${profile.intercambio ? 'Sim' : 'Não'}
      - Cargos Acadêmicos: ${JSON.stringify(profile.cargos_academicos) || 'Nenhum'}
      - Mural de Memórias: ${profile.memorias || 'Nenhuma'}
      
      IMPORTANTE: Considere os dados recém-sincronizados do usuário (Nome, Turma, Matérias). 
      Se os dados parecerem vazios ou incompletos, solicite que o usuário aguarde 5 segundos e tente novamente.
      
      Forneça:
      1. Um resumo do perfil (Persona Acadêmica)
      2. Sugestões de áreas do Direito para explorar
      3. Dicas para melhorar o currículo/experiência
      4. Uma frase motivacional personalizada.
      
      Retorne em Markdown.
    `;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }]
    });
    return response.text;
  },

  suggestPhotoCaption: async (base64Image: string, locationHint: string = "Pátio das Arcadas") => {
    const prompt = `
      Analise esta foto de um estudante de Direito da USP (SanFran). 
      O local provável é: ${locationHint}.
      
      Sugira 3 opções de legendas curtas e inspiradoras para o "Mural de Memórias".
      As legendas devem refletir a tradição do Largo São Francisco, o sentimento de pertencer às Arcadas e a jornada acadêmica.
      
      Retorne um JSON com um array de strings chamado "suggestions".
    `;

    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [
        {
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: { type: Type.STRING }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{"suggestions": []}');
  }
};

export const generateFlashcards = geminiService.generateFlashcards;
export const generateFlashcardsStream = geminiService.generateFlashcardsStream;
export const evaluateDissertativeAnswer = geminiService.evaluateDissertativeAnswer;
export const fetchTermDefinition = geminiService.fetchTermDefinition;
export const summarizeText = geminiService.summarizeText;
export const extractKeyPoints = geminiService.extractKeyPoints;
export const generateMindMap = geminiService.generateMindMap;
export const simplifyLegalText = geminiService.simplifyLegalText;
export const explainLegalTerm = geminiService.explainLegalTerm;
export const generateMnemonic = geminiService.generateMnemonic;
export const extractPrecedent = geminiService.extractPrecedent;
export const fetchLegalReference = geminiService.fetchLegalReference;
