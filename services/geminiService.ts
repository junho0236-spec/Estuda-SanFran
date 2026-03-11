import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const GEMINI_MODEL = "gemini-3.1-pro-preview";
const FLASH_MODEL = "gemini-3-flash-preview";

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
        // Tenta parsear o que temos até agora (pode falhar se o JSON estiver incompleto)
        // Uma implementação real de streaming de JSON seria mais complexa, 
        // mas aqui vamos apenas simular o comportamento esperado pelo componente.
        const partial = JSON.parse(fullText);
        if (Array.isArray(partial)) {
          onPartialResults(partial);
        }
      } catch (e) {
        // Ignora erros de parse durante o streaming
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
      Extraia as seguintes informações:
      - full_name: Nome Completo
      - turma: Ano de Ingresso (Turma)
      - progresso_obrigatorias: Porcentagem de Disciplinas Obrigatórias concluídas (0-100)
      - progresso_optativas: Porcentagem de Optativas concluídas (0-100)
      - status_geral_integralizacao: Status Geral de Integralização (0-100)
      - disciplinas: Lista de disciplinas do semestre atual contendo:
        - codigo: Código da disciplina (ex: DIN0123)
        - nome: Nome da disciplina
        - turma_sala: Turma e/ou Sala (ex: Turma 11 / Sala 201)
        - horarios: Objeto com os dias da semana e horários (ex: {"segunda": "08:00", "quarta": "08:00"})
      - aniversario: Data de nascimento (se disponível)
      
      Ignore informações sensíveis como CPF ou endereço residencial.
      Retorne apenas um JSON.
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
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            full_name: { type: Type.STRING },
            turma: { type: Type.NUMBER },
            progresso_obrigatorias: { type: Type.NUMBER },
            progresso_optativas: { type: Type.NUMBER },
            status_geral_integralizacao: { type: Type.NUMBER },
            aniversario: { type: Type.STRING },
            disciplinas: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  codigo: { type: Type.STRING },
                  nome: { type: Type.STRING },
                  turma_sala: { type: Type.STRING },
                  horarios: { type: Type.OBJECT }
                }
              }
            }
          }
        }
      }
    });

    return JSON.parse(response.text || '{}');
  },

  analyzeProfile: async (profile: any) => {
    const prompt = `
      Analise o seguinte perfil de estudante de Direito da USP (SanFran) e forneça insights personalizados:
      - Nome: ${profile.full_name || profile.username}
      - Turma: ${profile.turma}
      - Progresso: ${profile.progresso_curso}%
      - Idiomas: ${profile.idiomas?.join(', ')}
      - Intercâmbio: ${profile.intercambio ? 'Sim' : 'Não'}
      - Cargos Acadêmicos: ${JSON.stringify(profile.cargos_academicos)}
      - Mural de Memórias: ${profile.memorias}
      
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
