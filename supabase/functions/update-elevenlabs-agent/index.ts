import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { agentId } = await req.json();
    
    if (!agentId) {
      throw new Error("Agent ID is required");
    }

    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Optimized tool configurations
    const toolsConfig = {
      client_tools: {
        searchActivities: {
          description: "Search by title/name or with filters, then navigate to the activities list. Use when the user asks for a specific activity by name OR wants to browse with filters. If you find exactly one result, immediately call getActivityDetails with its id.",
          parameters: {
            type: "object",
            properties: {
              activityTitle: {
                type: "string",
                description: "Exact activity name from user's words, e.g., 'yoga suave'"
              },
              category: {
                type: "string",
                description: "Activity category to filter by"
              },
              location: {
                type: "string",
                description: "Location to filter activities"
              },
              dateFrom: {
                type: "string",
                description: "Start date in YYYY-MM-DD format"
              },
              dateTo: {
                type: "string",
                description: "End date in YYYY-MM-DD format"
              },
              maxCost: {
                type: "number",
                description: "Maximum cost as number, e.g., 100"
              },
              availableOnly: {
                type: "boolean",
                description: "Filter only available activities (true/false)"
              }
            }
          }
        },
        getActivityDetails: {
          description: "Open the detail page for a specific activity. Use after a successful search when the user wants the exact activity. At least one parameter is required.",
          parameters: {
            type: "object",
            properties: {
              activityId: {
                type: "string",
                description: "Unique identifier of the activity"
              },
              activityTitle: {
                type: "string",
                description: "Name of the activity"
              }
            }
          }
        },
        reserveActivity: {
          description: "Reserve a spot for the current user in a specific activity. Use only after confirming the activity details with the user.",
          parameters: {
            type: "object",
            properties: {
              activityId: {
                type: "string",
                description: "Unique identifier of the activity to reserve"
              },
              activityTitle: {
                type: "string",
                description: "Name of the activity being reserved"
              }
            },
            required: ["activityId", "activityTitle"]
          }
        },
        navigateToActivities: {
          description: "Go to the general activities page without running a search. Use ONLY for generic browsing like 'all yoga activities' or 'show activities'.",
          parameters: {
            type: "object",
            properties: {
              category: {
                type: "string",
                description: "Optional category to pre-filter the activities list"
              }
            }
          }
        },
        setFilter: {
          description: "Apply a single filter to the current search context. Use when user wants to refine their search criteria.",
          parameters: {
            type: "object",
            properties: {
              filterType: {
                type: "string",
                enum: ["category", "location", "cost", "date", "availability"],
                description: "Type of filter to apply"
              },
              value: {
                description: "Filter value (string, number, or boolean depending on filterType)"
              }
            },
            required: ["filterType", "value"]
          }
        },
        clearFilters: {
          description: "Remove all applied filters and show all activities. Use when user wants to start a fresh search.",
          parameters: {
            type: "object",
            properties: {}
          }
        },
        getMyReservations: {
          description: "Retrieve and list all activities the current user has reserved. Use when user asks 'what have I booked' or 'my reservations'.",
          parameters: {
            type: "object",
            properties: {}
          }
        },
        suggestActivities: {
          description: "Get AI-powered activity suggestions based on user preferences, budget, or date. Use when user asks for recommendations.",
          parameters: {
            type: "object",
            properties: {
              userPreferences: {
                type: "string",
                description: "User's interests or preferences"
              },
              budget: {
                type: "number",
                description: "Maximum budget as number"
              },
              date: {
                type: "string",
                description: "Preferred date in YYYY-MM-DD format"
              }
            }
          }
        },
        submitRating: {
          description: "Submit a rating and optional comment for a completed activity. Use after user attends an activity and wants to leave feedback.",
          parameters: {
            type: "object",
            properties: {
              activityId: {
                type: "string",
                description: "ID of the activity to rate"
              },
              activityTitle: {
                type: "string",
                description: "Name of the activity"
              },
              rating: {
                type: "number",
                description: "Rating from 1 to 5"
              },
              comment: {
                type: "string",
                description: "Optional text comment about the activity"
              }
            },
            required: ["activityId", "activityTitle", "rating"]
          }
        },
        getRatings: {
          description: "Fetch and summarize all ratings and reviews for a specific activity. Use when user asks about activity feedback or reviews.",
          parameters: {
            type: "object",
            properties: {
              activityId: {
                type: "string",
                description: "ID of the activity to get ratings for"
              },
              activityTitle: {
                type: "string",
                description: "Name of the activity"
              }
            },
            required: ["activityId", "activityTitle"]
          }
        }
      }
    };

    console.log(`Updating agent ${agentId} with optimized tools configuration`);

    // 1) Fetch current agent to get existing tools (so we only update descriptions/params)
    const getRes = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}` , {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
    });

    if (!getRes.ok) {
      const errorText = await getRes.text();
      console.error("ElevenLabs API (GET agent) error:", errorText);
      throw new Error(`Failed to fetch agent: ${getRes.status} - ${errorText}`);
    }

    const agentJson = await getRes.json();

    // The tools live under conversation_config.agent.prompt.tools (structure from EL logs)
    const existingTools =
      agentJson?.conversation_config?.agent?.prompt?.tools ??
      agentJson?.agent?.prompt?.tools ?? [];

    // Build a map of our optimized configs by tool name
    const optimizedByName = toolsConfig.client_tools as Record<string, { description: string; parameters: unknown }>;    

    const updatedTools = existingTools.map((tool: any) => {
      const update = optimizedByName[tool?.name];
      if (!update) return tool;
      return {
        ...tool,
        description: update.description,
        parameters: update.parameters,
      };
    });

    // 2) Patch the agent with updated tool descriptions/parameters only
    const response = await fetch(`https://api.elevenlabs.io/v1/convai/agents/${agentId}`, {
      method: "PATCH",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        conversation_config: {
          agent: {
            prompt: {
              tools: updatedTools,
            },
          },
        },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", errorText);
      throw new Error(`Failed to update agent: ${response.status} - ${errorText}`);
    }

    const updatedAgent = await response.json();
    console.log("Agent updated successfully:", updatedAgent);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Agent configuration updated successfully",
        agent: updatedAgent 
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error updating agent:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : "Unknown error" 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
