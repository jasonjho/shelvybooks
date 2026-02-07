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
    const lovableApiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!lovableApiKey) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // === INPUT VALIDATION ===
    let excludeTitles: string[] = [];
    try {
      const body = await req.json();
      if (Array.isArray(body?.excludeTitles)) {
        // Validate and sanitize: max 100 titles, max 200 chars each
        excludeTitles = body.excludeTitles
          .slice(0, 100)
          .filter((t: unknown): t is string => typeof t === 'string')
          .map((t: string) => t.slice(0, 200).trim().replace(/[<>]/g, ''));
      }
    } catch {
      // No body or invalid JSON, proceed without exclusions
    }

    // Add randomization to get different quotes each time
    const genres = [
      'literary fiction', 'fantasy', 'science fiction', 'romance', 
      'philosophy', 'memoir', 'contemporary fiction', 'classic literature',
      'dystopian', 'historical fiction', 'magical realism', 'adventure',
      'mystery', 'poetry', 'drama', 'satire'
    ];
    const randomGenre = genres[Math.floor(Math.random() * genres.length)];
    const randomSeed = Math.random().toString(36).substring(7);

    // Build exclusion instruction if there are books to avoid
    const exclusionNote = excludeTitles.length > 0
      ? `\n\nIMPORTANT: Do NOT choose quotes from any of these books (the user already has them): ${excludeTitles.slice(0, 50).join(', ')}.`
      : '';

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${lovableApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: `You are a literary expert. Generate a single inspiring, memorable quote from a well-known book. Return ONLY valid JSON in this exact format, no markdown or code blocks:
{"quote": "the quote text", "book": {"title": "Book Title", "author": "Author Name"}}`
          },
          {
            role: 'user',
            content: `Give me a memorable quote from a ${randomGenre} book. Pick something unexpected and lesser-known - avoid the most famous quotes. Make sure the quote is real and actually from the book you cite. Random seed: ${randomSeed}${exclusionNote}`
          }
        ],
        temperature: 1.2,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI API error:', response.status, errorText);
      throw new Error(`AI API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.choices?.[0]?.message?.content) {
      console.error('No content in AI response:', JSON.stringify(data));
      throw new Error('No response from AI');
    }

    const content = data.choices[0].message.content.trim();
    console.log('AI response content:', content);
    
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

    // Validate the response structure
    if (!quoteData.quote || !quoteData.book?.title || !quoteData.book?.author) {
      console.error('Invalid quote structure:', JSON.stringify(quoteData));
      throw new Error('Invalid quote structure');
    }

    // Generate a cover URL from Open Library with strict matching
    const titleQuery = encodeURIComponent(quoteData.book.title);
    const authorQuery = encodeURIComponent(quoteData.book.author);
    const olResponse = await fetch(
      `https://openlibrary.org/search.json?title=${titleQuery}&author=${authorQuery}&limit=5`
    );
    const olData = await olResponse.json();
    
    let coverUrl = '/placeholder.svg';
    
    // Find a result that actually matches our book
    if (olData.docs?.length > 0) {
      const normalizeStr = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, '');
      const targetTitle = normalizeStr(quoteData.book.title);
      const targetAuthor = normalizeStr(quoteData.book.author);
      
      for (const doc of olData.docs) {
        const docTitle = normalizeStr(doc.title || '');
        const docAuthors = (doc.author_name || []).map((a: string) => normalizeStr(a));
        
        // Check if title matches (contains or is contained)
        const titleMatches = docTitle.includes(targetTitle) || targetTitle.includes(docTitle);
        // Check if any author matches
        const authorMatches = docAuthors.some((a: string) => 
          a.includes(targetAuthor) || targetAuthor.includes(a)
        );
        
        if (titleMatches && authorMatches && doc.cover_i) {
          coverUrl = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
          console.log('Found matching cover for:', doc.title, 'by', doc.author_name?.join(', '));
          break;
        }
      }
      
      // If no verified match found but we have results with covers, log it
      if (coverUrl === '/placeholder.svg') {
        console.log('No verified cover match found for:', quoteData.book.title, 'by', quoteData.book.author);
      }
    }

    console.log('Returning quote:', quoteData.book.title, 'by', quoteData.book.author);

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
