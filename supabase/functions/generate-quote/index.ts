import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENROUTER_API_KEY')}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'Shelvy Book Quotes',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a literary expert. Generate a single inspiring, memorable quote from a well-known book. Return ONLY valid JSON in this exact format, no markdown:
{"quote": "the quote text", "book": {"title": "Book Title", "author": "Author Name"}}`
          },
          {
            role: 'user',
            content: 'Give me a memorable, inspiring quote from a classic or popular book. Choose something different and unexpected - not the most famous quotes everyone knows. Focus on books from various genres: literary fiction, fantasy, sci-fi, romance, philosophy, memoirs, or contemporary fiction.'
          }
        ],
        temperature: 1.0,
        max_tokens: 200,
      }),
    });

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      throw new Error('No response from AI');
    }

    const content = data.choices[0].message.content.trim();
    
    // Parse the JSON response
    let quoteData;
    try {
      // Remove any markdown code blocks if present
      const cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();
      quoteData = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error('Failed to parse AI response:', content);
      throw new Error('Invalid response format');
    }

    // Generate a cover URL from Open Library
    const searchQuery = encodeURIComponent(`${quoteData.book.title} ${quoteData.book.author}`);
    const olResponse = await fetch(
      `https://openlibrary.org/search.json?q=${searchQuery}&limit=1`
    );
    const olData = await olResponse.json();
    
    let coverUrl = '/placeholder.svg';
    if (olData.docs?.[0]?.cover_i) {
      coverUrl = `https://covers.openlibrary.org/b/id/${olData.docs[0].cover_i}-L.jpg`;
    }

    return new Response(
      JSON.stringify({
        quote: quoteData.quote,
        book: {
          title: quoteData.book.title,
          author: quoteData.book.author,
          coverUrl,
        },
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error generating quote:', message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
