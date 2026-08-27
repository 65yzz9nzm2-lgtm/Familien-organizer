// Family Assistant: abstraction over an AI provider so the app works out of
// the box (mock mode) and can later be pointed at a real LLM without any
// caller-side changes. A real implementation should run server-side (a
// Supabase Edge Function) so provider API keys never reach the browser -
// this client-side service should only ever call that function, never an
// AI provider directly.
//
// RLS still applies: the assistant must only be able to read data the
// requesting user already has access to (family-scoped + private-aware),
// so a real implementation should query through the same Supabase client
// (with the user's JWT) rather than a service-role key.

export interface AssistantMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface AssistantContext {
  familyId: string
  userId: string
}

function mockReply(question: string): string {
  const q = question.toLowerCase()
  if (q.includes('morgen') || q.includes('heute')) {
    return 'Der Family Assistant ist noch im Mock-Modus. Sobald eine KI-API verbunden ist, beantworte ich hier eure Termine, Aufgaben und Mahlzeiten aus dem Kalender und Essensplan.'
  }
  if (q.includes('einkauf')) {
    return 'Im Mock-Modus kann ich noch nicht auf eure Einkaufsliste zugreifen. Schau dafür unter "Einkauf" nach.'
  }
  if (q.includes('kochen') || q.includes('essen')) {
    return 'Sobald eine KI-API verbunden ist, schlage ich euch hier passende Rezepte aus eurer Sammlung vor.'
  }
  return 'Ich bin der FamilyHub Assistant im Mock-Modus (keine KI-API konfiguriert). Sobald eine API-Anbindung eingerichtet ist, kann ich Fragen zu Kalender, Finanzen, Einkauf und Essensplan eurer Familie beantworten.'
}

export const familyAssistantService = {
  isMockMode(): boolean {
    return !import.meta.env.VITE_AI_PROVIDER
  },

  async ask(question: string, _context: AssistantContext): Promise<string> {
    if (this.isMockMode()) {
      await new Promise((r) => setTimeout(r, 300))
      return mockReply(question)
    }
    // Real mode: call a Supabase Edge Function, e.g. supabase.functions.invoke('assistant-ask', { body: { question, ...context } })
    throw new Error('AI provider configured but not yet implemented. See src/services/family-assistant.service.ts')
  },
}
