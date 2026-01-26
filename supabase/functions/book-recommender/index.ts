import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BookInfo {
  title: string;
  author: string;
  status: string;
}

interface RecommendationRequest {
  books: BookInfo[];
  mood?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { books, mood } = await req.json() as RecommendationRequest;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // Build context from user's bookshelf
    const bookList = books.slice(0, 20).map((b, i) => 
      `${i + 1}. "${b.title}" by ${b.author} (${b.status})`
    ).join("\n");

    const readingStatus = {
      reading: books.filter(b => b.status === 'reading').length,
      read: books.filter(b => b.status === 'read').length,
      wantToRead: books.filter(b => b.status === 'want-to-read').length,
    };

    const moodContext = mood ? `\n\nThe reader is currently in the mood for: ${mood}` : '';

    const systemPrompt = `You are a delightful book recommender with a touch of magic ✨. You analyze someone's bookshelf to understand their taste and suggest books they'd love.

Be warm, enthusiastic, and sprinkle in some bookish charm. Keep recommendations diverse but aligned with their interests. Focus on books that feel like perfect matches.

Format your response as a JSON object with this structure:
{
  "insight": "A brief, charming observation about their reading taste (1-2 sentences)",
  "recommendations": [
    {
      "title": "Book Title",
      "author": "Author Name", 
      "reason": "A short, enthusiastic reason why they'd love this (1 sentence)",
      "vibe": "A 2-3 word vibe/mood tag like 'cozy adventure' or 'mind-bending'"
    }
  ]
}

Provide exactly 3 recommendations. Make sure they're real, well-known books.`;

    const userPrompt = `Here's my bookshelf (${books.length} total books):
- Currently reading: ${readingStatus.reading}
- Already read: ${readingStatus.read}  
- Want to read: ${readingStatus.wantToRead}

Recent books:
${bookList}${moodContext}

What magical books would you recommend for me?`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits depleted. Please add credits to continue." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error("Failed to get AI recommendations");
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    let recommendations;
    try {
      // Try to extract JSON from the response (it might have markdown code blocks)
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error("No JSON found in response");
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      throw new Error("Failed to parse recommendations");
    }

    return new Response(JSON.stringify(recommendations), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("book-recommender error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
