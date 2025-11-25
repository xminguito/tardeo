import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");

    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", ""),
    );
    if (userError || !user) throw new Error("Invalid user token");

    const {
      conversation_id,
      receiver_id,
      content,
      content_type,
      reply_with_ai,
    } = await req.json();

    if (!content) throw new Error("Message content is required");

    let finalConversationId = conversation_id;
    let finalReceiverId = receiver_id;

    // 1. Resolve Conversation ID
    if (!finalConversationId) {
      if (!finalReceiverId) {
        throw new Error("Receiver ID is required to start a conversation");
      }

      // Check if conversation exists
      const { data: existingConv } = await supabase
        .from("conversations")
        .select("id")
        .or(
          `and(user_a.eq.${user.id},user_b.eq.${finalReceiverId}),and(user_a.eq.${finalReceiverId},user_b.eq.${user.id})`,
        )
        .single();

      if (existingConv) {
        finalConversationId = existingConv.id;
      } else {
        // Create new conversation
        const { data: newConv, error: createError } = await supabase
          .from("conversations")
          .insert({ user_a: user.id, user_b: finalReceiverId })
          .select()
          .single();

        if (createError) throw createError;
        finalConversationId = newConv.id;
      }
    } else {
      // Fetch receiver_id if not provided but conversation_id is
      if (!finalReceiverId) {
        const { data: conv } = await supabase.from("conversations").select(
          "user_a, user_b",
        ).eq("id", finalConversationId).single();
        if (conv) {
          finalReceiverId = conv.user_a === user.id ? conv.user_b : conv.user_a;
        }
      }
    }

    let audioUrl = null;

    // 2. ElevenLabs Integration (Text -> Audio)
    if (content_type === "audio") {
      const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
      const VOICE_ID = "21m00Tcm4TlvDq8ikWAM"; // Default voice or fetch from user settings

      if (ELEVENLABS_API_KEY) {
        const ttsResponse = await fetch(
          `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
          {
            method: "POST",
            headers: {
              "xi-api-key": ELEVENLABS_API_KEY,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              text: content,
              model_id: "eleven_monolingual_v1",
              voice_settings: { stability: 0.5, similarity_boost: 0.5 },
            }),
          },
        );

        if (ttsResponse.ok) {
          const audioBuffer = await ttsResponse.arrayBuffer();
          const fileName = `${finalConversationId}/${Date.now()}.mp3`;

          // Upload to Storage
          const { error: uploadError } = await supabase.storage
            .from("chat-attachments")
            .upload(fileName, audioBuffer, {
              contentType: "audio/mpeg",
              upsert: false,
            });

          if (!uploadError) {
            const { data: { publicUrl } } = supabase.storage.from(
              "chat-attachments",
            ).getPublicUrl(fileName);
            audioUrl = publicUrl;
          } else {
            console.error("Storage upload error:", uploadError);
          }
        } else {
          console.error("ElevenLabs error:", await ttsResponse.text());
        }
      }
    }

    // 3. Insert User Message
    const { error: msgError } = await supabase.from("messages").insert({
      conversation_id: finalConversationId,
      sender_id: user.id,
      receiver_id: finalReceiverId,
      content,
      content_type: content_type || "text",
      audio_url: audioUrl,
      ai_generated: false,
    });

    if (msgError) throw msgError;

    // 4. Update Conversation (Last Message)
    // Determine which unread count to increment
    // We need to know if user is A or B
    const { data: convData } = await supabase.from("conversations").select(
      "user_a, user_b",
    ).eq("id", finalConversationId).single();
    const isUserA = convData?.user_a === user.id;

    // If user is A, increment B's unread count. If user is B, increment A's.
    const updateData: any = {
      last_message: content_type === "audio" ? "🎤 Audio message" : content,
      last_message_at: new Date().toISOString(),
    };

    if (isUserA) {
      // Increment unread_count_b
      await supabase.rpc("increment_counter", {
        table_name: "conversations",
        row_id: finalConversationId,
        column_name: "unread_count_b",
      });
    } else {
      // Increment unread_count_a
      await supabase.rpc("increment_counter", {
        table_name: "conversations",
        row_id: finalConversationId,
        column_name: "unread_count_a",
      });
    }

    await supabase.from("conversations").update(updateData).eq(
      "id",
      finalConversationId,
    );

    // Send notification to receiver
    await supabase.from("notifications").insert({
      user_id: finalReceiverId,
      type: "new_message",
      title: "notifications.newMessageTitle",
      message: content_type === "audio"
        ? "notifications.newAudioMessageContent"
        : "notifications.newMessageContent",
      read: false,
    });

    // 5. OpenAI Integration (Reply with AI)
    if (reply_with_ai) {
      const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
      if (OPENAI_API_KEY) {
        const aiResponse = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${OPENAI_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                {
                  role: "system",
                  content: "You are a helpful assistant in a chat app.",
                },
                { role: "user", content },
              ],
            }),
          },
        );

        const aiData = await aiResponse.json();
        const aiText = aiData.choices?.[0]?.message?.content;

        if (aiText) {
          // Insert AI Message (sender is still the user? or a system bot?
          // Requirement: "pipes message through assistant... and sends response as message (ai_generated = true)"
          // Usually this means the AI responds on behalf of the user or TO the user.
          // "Reply with AI" implies the AI is helping the user reply? Or answering the user?
          // "Ask AI inside the chat screen... Response is stored as a message with ai_generated = true"
          // Let's assume it's a response TO the user in the context of the chat, or maybe a suggested reply?
          // "Reply with AI" -> pipes message through assistant and sends response as message.
          // Let's assume it's the AI replying TO the sender for now, or maybe replying to the receiver?
          // If "Ask AI", it's usually the user asking the AI.
          // Let's treat it as a message from the AI to the chat. Sender ID?
          // Maybe null? Or the user ID but flagged?
          // Let's use the user ID but flag it, or use a system ID.
          // The schema has `sender_id` FK to profiles. So it must be a valid user.
          // Let's use the current user as sender but `ai_generated: true`.

          await supabase.from("messages").insert({
            conversation_id: finalConversationId,
            sender_id: user.id, // AI speaks on behalf of user? Or we need a bot user.
            receiver_id: finalReceiverId,
            content: aiText,
            content_type: "text",
            ai_generated: true,
          });

          // Update conversation again
          await supabase.from("conversations").update({
            last_message: aiText,
            last_message_at: new Date().toISOString(),
          }).eq("id", finalConversationId);
        }
      }
    }

    return new Response(
      JSON.stringify({ success: true, conversationId: finalConversationId }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
