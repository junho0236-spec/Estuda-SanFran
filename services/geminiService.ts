import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });

export const GEMINI_MODEL = "gemini-3.1-flash-lite-preview";
const FLASH_MODEL = "gemini-3.1-flash-lite-preview";

const cleanJsonResponse = (text: string) => {
  console.log("Raw Gemini Response:", text);
  // Remove markdown code blocks
  let cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
  
  // Find the first '{' or '[' and last '}' or ']'
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  const lastBrace = cleaned.lastIndexOf('}');
  const lastBracket = cleaned.lastIndexOf(']');
  
  let start = -1;
  let end = -1;
  
  if (firstBrace !== -1 && firstBracket !== -1) {
    start = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    start = firstBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
  }
  
  if (lastBrace !== -1 && lastBracket !== -1) {
    end = Math.max(lastBrace, lastBracket);
  } else if (lastBrace !== -1) {
    end = lastBrace;
  } else if (lastBracket !== -1) {
    end = lastBracket;
  }
  
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
      Você é um Professor Doutor da Faculdade de Direito do Largo São Francisco (USP), especialista em avaliação acadêmica rigorosa.
      Sua tarefa é avaliar a resposta dissertativa de um aluno para um flashcard de revisão.

      CONTEÚDO DO FLASHCARD:
      - Pergunta/Frente: ${question}
      - Resposta Padrão/Gabarito: ${expectedAnswer}

      RESPOSTA DO ALUNO:
      - "${userAnswer}"

      DIRETRIZES DE AVALIAÇÃO:
      1. Profundidade Técnica: Analise se o aluno utilizou a terminologia jurídica correta e se demonstrou compreensão dos institutos envolvidos.
      2. Contextualização: Relacione a resposta com a doutrina, jurisprudência ou legislação pertinente mencionada no gabarito.
      3. Lacunas: Identifique precisamente o que faltou para a resposta ser considerada excelente (nota 10).
      4. Feedback Construtivo: O feedback deve ser denso, acadêmico, porém encorajador. Não seja genérico. Aponte onde o raciocínio foi correto e onde houve imprecisão técnica.

      REQUISITOS DO JSON DE RETORNO:
      - score: Nota de 0.0 a 10.0 (seja criterioso, como um professor da SanFran).
      - feedback: Um texto rico e estruturado (use Markdown para negrito em termos importantes). Explique o "porquê" da nota.
      - missing_keywords: Lista de termos técnicos, artigos de lei ou conceitos fundamentais que o aluno omitiu.
      - is_perfect: Boolean (true apenas se a resposta for equivalente ou superior ao gabarito em técnica e precisão).

      IMPORTANTE: Se a resposta for muito curta ou vaga, a nota deve refletir isso. Se for excelente, elogie a precisão técnica.
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
            feedback: { type: Type.STRING },
            missing_keywords: { 
              type: Type.ARRAY,
              items: { type: Type.STRING }
            },
            is_perfect: { type: Type.BOOLEAN }
          },
          required: ["score", "feedback", "missing_keywords", "is_perfect"]
        }
      }
    });
    let resultText = response.text || '{}';
    // Remove markdown code blocks if present
    if (resultText.startsWith('```json')) {
      resultText = resultText.replace(/^```json\n/, '').replace(/\n```$/, '');
    } else if (resultText.startsWith('```')) {
      resultText = resultText.replace(/^```\n/, '').replace(/\n```$/, '');
    }
    
    let result;
    try {
      result = JSON.parse(resultText);
    } catch (e) {
      console.error("Failed to parse AI evaluation JSON:", resultText);
      result = {
        score: 0,
        feedback: "Erro ao processar a avaliação da IA. Por favor, tente novamente.",
        missing_keywords: [],
        is_perfect: false
      };
    }
    
    if (!result.missing_keywords) result.missing_keywords = [];
    if (typeof result.score !== 'number') result.score = 0;
    return result;
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
  },

  generatePracticalCase: async (subject: string, topic: string) => {
    const prompt = `
      Gere um mini-caso prático de Direito (máximo 2-3 linhas) sobre o tema "${topic}" na matéria "${subject}".
      O caso deve apresentar uma situação fática e perguntar qual seria a decisão fundamentada.
      
      Retorne um JSON com:
      - case: O texto do caso prático
      - question: A pergunta sobre a decisão
      - answer: A resposta fundamentada (gabarito)
    `;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            case: { type: Type.STRING },
            question: { type: Type.STRING },
            answer: { type: Type.STRING }
          },
          required: ["case", "question", "answer"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  generateFlashcardFromHighlight: async (text: string) => {
    const prompt = `
      Transforme o seguinte trecho de uma nota de estudo em um flashcard (frente e verso):
      "${text}"
      
      O flashcard deve ser conciso e focado no conceito principal.
      Retorne um JSON com:
      - front: A pergunta ou conceito
      - back: A resposta ou explicação
    `;
    const response = await ai.models.generateContent({
      model: FLASH_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING }
          },
          required: ["front", "back"]
        }
      }
    });
    return JSON.parse(response.text || '{}');
  },

  generateClozeCards: async (text: string, count: number = 5) => {
    const prompt = `
      Gere ${count} flashcards de preenchimento de lacunas (Cloze) baseados no seguinte texto de lei ou doutrina:
      "${text}"
      
      Para cada card, omita uma palavra ou expressão fundamental usando "[...]".
      Retorne um JSON com um array de objetos contendo:
      - front: O texto com a lacuna "[...]"
      - back: A palavra ou expressão omitida
      - tags: ["Cloze", "Lei"]
    `;
    const response = await ai.models.generateContent({
      model: GEMINI_MODEL,
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              front: { type: Type.STRING },
              back: { type: Type.STRING },
              tags: { type: Type.ARRAY, items: { type: Type.STRING } }
            },
            required: ["front", "back", "tags"]
          }
        }
      }
    });
    return JSON.parse(response.text || '[]');
  },

  checkJurisprudence: async (question: string, answer: string) => {
    const prompt = `
      Verifique se o seguinte entendimento jurídico ainda é válido de acordo com a jurisprudência atual do STF e STJ:
      Questão: ${question}
      Entendimento/Gabarito: ${answer}
      
      Pesquise por alterações legislativas recentes ou novos precedentes que possam ter revogado ou modificado este entendimento.
      Retorne um JSON com:
      - isValid: boolean
      - status: "atualizado" | "desatualizado" | "divergente"
      - explanation: Breve explicação em Markdown citando a fonte (Lei, Informativo, Súmula)
      - sources: Array de URLs encontradas
    `;
    
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            isValid: { type: Type.BOOLEAN },
            status: { type: Type.STRING },
            explanation: { type: Type.STRING },
            sources: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["isValid", "status", "explanation"]
        }
      }
    });
    
    return JSON.parse(response.text || '{}');
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
export const generatePracticalCase = geminiService.generatePracticalCase;
export const generateFlashcardFromHighlight = geminiService.generateFlashcardFromHighlight;
export const generateClozeCards = geminiService.generateClozeCards;
export const checkJurisprudence = geminiService.checkJurisprudence;
