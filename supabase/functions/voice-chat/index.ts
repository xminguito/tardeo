import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.76.1';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';
import { checkUserTTSThrottle } from '../_shared/ttsProviderSelector.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Validation schema for voice chat messages
const voiceChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string().max(10000, "Message content too long (max 10KB)")
    })
  ).max(50, "Too many messages (max 50)")
});

// Tool definitions for the assistant
const tools = [
  {
    type: "function",
    function: {
      name: "searchActivities",
      description: "Busca actividades disponibles en la plataforma. Usa esta herramienta cuando el usuario pregunte por actividades, eventos, talleres, clases, o quiera encontrar algo que hacer.",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Texto de búsqueda (nombre de actividad, tipo, tema)"
          },
          category: {
            type: "string",
            description: "Categoría de la actividad (yoga, pintura, café, social, etc.)"
          },
          location: {
            type: "string", 
            description: "Ciudad o ubicación donde buscar"
          }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getActivityDetails",
      description: "Obtiene los detalles completos de una actividad específica por su título.",
      parameters: {
        type: "object",
        properties: {
          activityTitle: {
            type: "string",
            description: "El título de la actividad"
          }
        },
        required: ["activityTitle"]
      }
    }
  }
];

// Execute tool calls
async function executeToolCall(
  toolName: string, 
  args: Record<string, any>,
  supabaseClient: any
): Promise<string> {
  console.log(`Executing tool: ${toolName}`, args);
  
  try {
    if (toolName === "searchActivities") {
      let query = supabaseClient
        .from('activities')
        .select('id, title, description, category, date, time, location, city, cost, max_participants, current_participants')
        .order('date', { ascending: true })
        .limit(5);

      // Apply filters based on args
      if (args.category) {
        query = query.ilike('category', `%${args.category}%`);
      }
      if (args.query) {
        query = query.or(`title.ilike.%${args.query}%,description.ilike.%${args.query}%,category.ilike.%${args.query}%`);
      }
      if (args.location) {
        query = query.or(`city.ilike.%${args.location}%,location.ilike.%${args.location}%`);
      }

      const { data: activities, error } = await query;
      
      if (error) {
        console.error('Search error:', error);
        return "Error al buscar actividades. Por favor, intenta de nuevo.";
      }

      if (!activities || activities.length === 0) {
        return "No encontré actividades que coincidan con tu búsqueda. ¿Te gustaría buscar algo diferente?";
      }

      // Helper to generate slug (must match src/lib/utils.ts generateActivitySlug)
      const generateSlug = (title: string, id: string) => {
        const slug = title
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '') // Remove accents
          .replace(/[^\w\s-]/g, '') // Remove special chars except word chars, spaces, hyphens
          .replace(/\s+/g, '-') // Replace spaces with hyphens
          .replace(/-+/g, '-') // Replace multiple hyphens
          .trim();
        return `${slug}-${id}`;
      };

      // Helper to format date compactly
      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
      };

      // TOON format: compact token-efficient serialization
      // If only 1 activity found, include navigation command
      if (activities.length === 1) {
        const a = activities[0];
        const spots = (a.max_participants || 0) - (a.current_participants || 0);
        const cost = a.cost === 0 ? 'Gratis' : `${a.cost}€`;
        const slug = generateSlug(a.title, a.id);
        const navPath = `/actividades/${slug}`;
        
        // TOON format for single activity with navigation
        return `act{titulo,cat,fecha,hora,lugar,precio,plazas}:
${a.title},${a.category},${formatDate(a.date)},${a.time},${a.city || a.location},${cost},${spots}
[NAVIGATE:${navPath}]`;
      }

      // TOON format for multiple activities
      const toonRows = activities.map((a: any) => {
        const spots = (a.max_participants || 0) - (a.current_participants || 0);
        const cost = a.cost === 0 ? 'Gratis' : `${a.cost}€`;
        return `${a.title},${a.category},${formatDate(a.date)},${a.time},${a.city || a.location},${cost},${spots}`;
      }).join('\n');

      return `acts[${activities.length}]{titulo,cat,fecha,hora,lugar,precio,plazas}:
${toonRows}`;
    }
    
    if (toolName === "getActivityDetails") {
      const { data: activity, error } = await supabaseClient
        .from('activities')
        .select('*')
        .ilike('title', `%${args.activityTitle}%`)
        .single();

      if (error || !activity) {
        return `No encontré "${args.activityTitle}".`;
      }

      const spots = (activity.max_participants || 0) - (activity.current_participants || 0);
      const cost = activity.cost === 0 ? 'Gratis' : `${activity.cost}€`;
      
      // Helper to format date compactly
      const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        const days = ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'];
        const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${days[d.getDay()]} ${d.getDate()} ${months[d.getMonth()]}`;
      };
      
      const generateSlug = (title: string, id: string) => {
        return title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-').trim() + '-' + id;
      };

      // TOON format for activity details
      return `detail{titulo,cat,fecha,hora,lugar,precio,plazas,max,desc}:
${activity.title},${activity.category},${formatDate(activity.date)},${activity.time},${activity.city},${cost},${spots},${activity.max_participants},${activity.description?.slice(0, 100) || 'Sin descripción'}
[NAVIGATE:${`/actividades/${generateSlug(activity.title, activity.id)}`}]`;
    }

    return "Herramienta no reconocida.";
  } catch (error) {
    console.error(`Tool execution error (${toolName}):`, error);
    return "Hubo un error al procesar tu solicitud. Por favor, intenta de nuevo.";
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Optional user authentication
    const authHeader = req.headers.get('Authorization');
    let user: any = null;
    
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
    );
    
    if (authHeader) {
      try {
        const { data, error: authError } = await supabaseClient.auth.getUser();
        if (!authError) {
          user = data.user;
        }
      } catch (e) {
        console.error('Auth check error:', e);
      }
    }

    console.log(user ? `Authenticated user: ${user.id}` : 'Proceeding as guest');
    
    // Check per-user throttling for voice chat
    const throttleCheck = await checkUserTTSThrottle(supabaseClient, user?.id || null);
    if (!throttleCheck.allowed) {
      console.warn(`[Voice Chat] User ${user?.id} throttled:`, throttleCheck.reason);
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: throttleCheck.reason,
          retry_after: 60,
          current_minute: throttleCheck.current_minute,
          current_day: throttleCheck.current_day,
        }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Parse and validate request body
    const body = await req.json();
    const validationResult = voiceChatSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ error: 'Invalid request', details: validationResult.error.errors }), 
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const { messages } = validationResult.data;
    const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
    
    if (!OPENAI_API_KEY) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const systemPrompt = `Eres un asistente amigable para Tardeo, ayudando a personas mayores a encontrar actividades.

REGLAS:
1. Sin emojis, solo texto
2. Respuestas cortas (2-3 frases)
3. OBLIGATORIO: Usa searchActivities para CUALQUIER consulta de actividades
4. NO inventes datos. Solo usa resultados de searchActivities
5. [NAVIGATE:...] activa navegación automática

FORMATO TOON:
Los resultados vienen en TOON (Token-Oriented Object Notation):
- act{campos}: fila → 1 actividad
- acts[N]{campos}: filas → N actividades
Campos: titulo,cat,fecha,hora,lugar,precio,plazas

EJEMPLO de interpretación TOON:
Input: act{titulo,cat,fecha,hora,lugar,precio,plazas}:
Yoga Suave,Deporte,lun 27 oct,18:00,Barcelona,Gratis,20

Output: He encontrado "Yoga Suave", una actividad de Deporte el lunes 27 de octubre a las 18:00 en Barcelona. Es gratis y hay 20 plazas.

USA searchActivities SIEMPRE para consultas de actividades.`;

    // First API call - may include tool calls
    const initialResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        tools,
        tool_choice: "auto",
        max_tokens: 500,
      }),
    });

    if (!initialResponse.ok) {
      const errorText = await initialResponse.text();
      console.error("OpenAI error:", initialResponse.status, errorText);
      
      if (initialResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: "Límite de peticiones alcanzado, intenta más tarde." }), 
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      
      throw new Error(`OpenAI API error: ${initialResponse.status}`);
    }

    const initialData = await initialResponse.json();
    const assistantMessage = initialData.choices[0].message;

    // Check if the model wants to call tools
    if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
      console.log("Tool calls requested:", assistantMessage.tool_calls);
      
      // Execute all tool calls and track navigation commands
      let navigationCommand = '';
      const toolResults = await Promise.all(
        assistantMessage.tool_calls.map(async (toolCall: any) => {
          const args = JSON.parse(toolCall.function.arguments);
          const result = await executeToolCall(toolCall.function.name, args, supabaseClient);
          
          // Extract navigation command from tool result - must be a valid path starting with /
          const navMatch = result.match(/\[NAVIGATE:(\/[a-zA-Z0-9\-\/_]+)\]/);
          if (navMatch) {
            navigationCommand = navMatch[1];
            console.log("Extracted navigation path:", navigationCommand);
          }
          
          return {
            tool_call_id: toolCall.id,
            role: "tool" as const,
            content: result.replace(/\n?\[NAVIGATE:[^\]]+\]/, '').trim(), // Remove from content passed to model
          };
        })
      );

      // Make second API call with tool results
      const finalResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            ...messages,
            assistantMessage,
            ...toolResults,
          ],
          max_tokens: 500,
        }),
      });

      if (!finalResponse.ok) {
        const errorText = await finalResponse.text();
        console.error("OpenAI final error:", finalResponse.status, errorText);
        throw new Error(`OpenAI API error: ${finalResponse.status}`);
      }

      const finalData = await finalResponse.json();
      let finalContent = finalData.choices[0].message.content;
      
      // Append navigation command if present (so frontend can detect it)
      if (navigationCommand) {
        finalContent += `[NAVIGATE:${navigationCommand}]`;
        console.log("Adding navigation command:", navigationCommand);
      }

      // Return as SSE format for compatibility with existing client
      const sseResponse = `data: ${JSON.stringify({ choices: [{ delta: { content: finalContent } }] })}\n\ndata: [DONE]\n\n`;
      
      return new Response(sseResponse, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - return direct response as SSE
    const content = assistantMessage.content || "";
    const sseResponse = `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\ndata: [DONE]\n\n`;
    
    return new Response(sseResponse, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });

  } catch (e) {
    console.error("voice-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Error desconocido" }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
